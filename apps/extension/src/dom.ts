export type InjectionTarget = {
  container: HTMLElement;
  insertBefore: HTMLElement | null;
  type: "file-toolbar" | "repo-nav";
};

// Check if we're on a file view page (blob or blame)
const isFileViewPage = (): boolean => {
  const path = window.location.pathname;
  return path.includes("/blob/") || path.includes("/blame/");
};

// Find the file toolbar (Preview | Code | Blame area) for file views
const findFileToolbarTarget = (doc: Document): InjectionTarget | null => {
  // IMPORTANT: Only look in the main content area, NOT in the file tree sidebar
  const mainContent = doc.querySelector<HTMLElement>(
    '[data-selector="repos-split-pane-content"]',
  );
  if (!mainContent) return null;

  // Look for the specific segmented control that GitHub uses for Code/Blame
  const fileViewControl = mainContent.querySelector<HTMLElement>(
    'ul[aria-label="File view"][class*="SegmentedControl"]',
  );

  if (fileViewControl) {
    const hasCodeButton = fileViewControl.querySelector('[data-text="Code"]');
    const hasBlameButton = fileViewControl.querySelector('[data-text="Blame"]');

    if (hasCodeButton && hasBlameButton) {
      return {
        container: fileViewControl,
        insertBefore: null, // Append to end
        type: "file-toolbar",
      };
    }
  }

  return null;
};

// Find the repo navigation for non-file pages
const findRepoNavTarget = (doc: Document): InjectionTarget | null => {
  // IMPORTANT: Find the repo nav list specifically in the header (NOT in file tree)
  const repoHeader = doc.querySelector<HTMLElement>(
    "#repository-container-header",
  );

  if (!repoHeader) {
    const stickyHeader = doc.querySelector<HTMLElement>(
      ".react-blob-view-header-sticky",
    );
    if (stickyHeader) {
      const navList = stickyHeader.querySelector<HTMLElement>(
        'nav[aria-label="Repository"] ul',
      );
      if (navList) {
        return { container: navList, insertBefore: null, type: "repo-nav" };
      }
    }
    return null;
  }

  // Look for Settings tab link by data attribute within repo header only
  const settingsLink = repoHeader.querySelector<HTMLAnchorElement>(
    'a[data-tab-item="i10settings-tab"]',
  );
  if (settingsLink) {
    const li = settingsLink.closest("li");
    if (li?.parentElement) {
      return {
        container: li.parentElement,
        insertBefore: li,
        type: "repo-nav",
      };
    }
  }

  // Try finding by Settings text in repo header nav only
  const navList = repoHeader.querySelector<HTMLElement>(
    'nav[aria-label="Repository"] ul',
  );
  if (navList) {
    const allLinks = navList.querySelectorAll<HTMLAnchorElement>(
      'a[href*="/settings"]',
    );
    for (const link of allLinks) {
      if (link.textContent?.trim() === "Settings") {
        const li = link.closest("li");
        if (li) {
          return {
            container: navList,
            insertBefore: li,
            type: "repo-nav",
          };
        }
      }
    }
    return { container: navList, insertBefore: null, type: "repo-nav" };
  }

  const underlineNav = repoHeader.querySelector<HTMLElement>(
    ".UnderlineNav-body",
  );
  if (underlineNav) {
    return { container: underlineNav, insertBefore: null, type: "repo-nav" };
  }

  return null;
};

// Main function to find the injection target based on page type
export const findInjectionTarget = (doc: Document): InjectionTarget | null => {
  // On file view pages, ONLY use the file toolbar (next to Blame button)
  // Do NOT fall back to repo nav on file pages
  if (isFileViewPage()) {
    return findFileToolbarTarget(doc);
  }

  // For non-file pages (repo home, etc), use repo nav
  return findRepoNavTarget(doc);
};

export const findRawLink = (doc: Document): HTMLAnchorElement | null => {
  const selectors = [
    "a#raw-url",
    "a[data-testid='raw-button']",
    "a[href*='raw.githubusercontent.com']",
  ];

  for (const selector of selectors) {
    const link = doc.querySelector<HTMLAnchorElement>(selector);
    if (link?.href) return link;
  }

  return null;
};
