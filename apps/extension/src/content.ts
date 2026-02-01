import { buildBetterDiffUrl } from "./open";
import { parseGitHubFileContext } from "./url";
import { findInjectionTarget, type InjectionTarget } from "./dom";

const BUTTON_DATA_ATTR = "data-betterdiff";

const isRepoPage = (): boolean => {
  const path = window.location.pathname;
  const parts = path.split("/").filter(Boolean);
  // Must have at least owner/repo
  if (parts.length < 2) return false;
  // Exclude non-repo pages
  const excludedPaths = [
    "settings",
    "issues",
    "pulls",
    "actions",
    "projects",
    "security",
    "pulse",
    "graphs",
    "notifications",
    "explore",
    "marketplace",
    "sponsors",
  ];
  if (parts.length >= 3 && excludedPaths.includes(parts[2])) return false;
  return true;
};

const handleButtonClick = (e: Event) => {
  e.preventDefault();
  e.stopPropagation();
  const context = parseGitHubFileContext(document, window.location.href);
  if (!context) {
    console.warn("[BetterDiff] Could not parse page context");
    return;
  }
  const url = buildBetterDiffUrl(context);
  window.open(url, "_blank", "noopener,noreferrer");
};

// Create button for the file toolbar (next to Preview/Code/Blame)
const createFileToolbarButton = () => {
  // Create the list item wrapper to match GitHub's structure
  const li = document.createElement("li");
  li.setAttribute(BUTTON_DATA_ATTR, "true");
  li.className = "prc-SegmentedControl-Item-tSCQh";

  // Create the button element
  const button = document.createElement("button");
  button.setAttribute("aria-current", "false");
  button.className = "prc-SegmentedControl-Button-E48xz";
  button.setAttribute("type", "button");
  button.setAttribute("title", "Open in BetterDiff");
  button.style.cssText = "--separator-color: transparent;";

  // Create the content structure matching GitHub's segmented control
  button.innerHTML = `
    <span class="prc-SegmentedControl-Content-1COlk segmentedControl-content">
      <div class="prc-SegmentedControl-Text-7S2y2 segmentedControl-text" data-text="BetterDiff">
        BetterDiff
      </div>
    </span>
  `;

  button.addEventListener("click", handleButtonClick);

  li.appendChild(button);
  return li;
};

// Create the appropriate button based on target type
const createButton = (targetType: InjectionTarget["type"]) => {
  if (targetType !== "file-toolbar") return;
  return createFileToolbarButton();
};

const removeExistingButtons = () => {
  document
    .querySelectorAll(`[${BUTTON_DATA_ATTR}]`)
    .forEach((el) => el.remove());
};

const injectButton = (): boolean => {
  if (!isRepoPage()) return false;

  // Check if button already exists
  if (document.querySelector(`[${BUTTON_DATA_ATTR}]`)) return true;

  const target = findInjectionTarget(document);
  if (!target) return false;

  const button = createButton(target.type);

  if (!button) return false;

  target.container.insertBefore(button, target.insertBefore);
  return true;
};

let currentPath = window.location.pathname;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let observer: MutationObserver | null = null;
let observerRoot: HTMLElement | null = null;
let syncScheduled = false;

const clearRetryTimer = () => {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
};

const disconnectObserver = () => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  observerRoot = null;
};

const scheduleSync = () => {
  if (syncScheduled) return;
  syncScheduled = true;
  requestAnimationFrame(() => {
    syncScheduled = false;
    syncButton();
  });
};

const syncButton = () => {
  if (!isRepoPage()) {
    removeExistingButtons();
    return;
  }

  const target = findInjectionTarget(document);
  const existingButton = document.querySelector(`[${BUTTON_DATA_ATTR}]`);

  if (
    existingButton &&
    (!target || !target.container.contains(existingButton))
  ) {
    removeExistingButtons();
  }

  if (!document.querySelector(`[${BUTTON_DATA_ATTR}]`) && target) {
    const button = createButton(target.type);
    if (!button) return;
    target.container.insertBefore(button, target.insertBefore);
  }
};

const tryInjectWithRetry = (retriesLeft: number) => {
  clearRetryTimer();

  if (injectButton()) {
    return;
  }

  if (retriesLeft > 0) {
    // Retry with exponential backoff
    retryTimer = setTimeout(() => {
      tryInjectWithRetry(retriesLeft - 1);
    }, 500);
  } else {
    // Out of retries - set up a targeted observer
    setupTargetedObserver();
  }
};

const setupTargetedObserver = () => {
  // Only observe the main content area where our button targets live
  const mainContent = document.querySelector<HTMLElement>(
    '[data-selector="repos-split-pane-content"]',
  );
  const targetRoot = mainContent ?? document.body;
  if (!targetRoot) return;

  if (observer && observerRoot === targetRoot) return;
  disconnectObserver(); // Clear any existing observer
  observerRoot = targetRoot;

  observer = new MutationObserver(() => {
    scheduleSync();

    if (observerRoot === document.body) {
      const main = document.querySelector<HTMLElement>(
        '[data-selector="repos-split-pane-content"]',
      );
      if (main) {
        setupTargetedObserver();
      }
    }
  });

  observer.observe(targetRoot, {
    childList: true,
    subtree: true,
  });
};

const handleNavigation = () => {
  const newPath = window.location.pathname;
  if (newPath !== currentPath) {
    currentPath = newPath;
    // Path changed - remove old button and re-sync for the new page
    removeExistingButtons();
    setupTargetedObserver();
    // Use requestAnimationFrame to avoid interfering with GitHub's DOM updates
    requestAnimationFrame(() => {
      tryInjectWithRetry(5);
    });
  }
  // If path hasn't changed, don't do anything to avoid triggering file tree collapse
};

const start = () => {
  // Try to inject with retries + fallback observer for React SPA
  // Use requestAnimationFrame to avoid interfering with GitHub's initial render
  setupTargetedObserver();
  requestAnimationFrame(() => {
    tryInjectWithRetry(5);
  });

  // Listen for GitHub's navigation events only
  // turbo:load handles navigation between pages
  document.addEventListener("turbo:load", handleNavigation, { passive: true });
  window.addEventListener("popstate", handleNavigation, { passive: true });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  // Small delay to let GitHub finish initial render
  setTimeout(start, 300);
}
