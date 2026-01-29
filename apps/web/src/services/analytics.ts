import posthog from "posthog-js";

type AnalyticsEventName =
  | "app_opened"
  | "login_viewed"
  | "login_started"
  | "login_succeeded"
  | "repos_viewed"
  | "repo_viewed"
  | "settings_viewed"
  | "file_history_opened"
  | "hotspots_opened"
  | "ai_panel_opened"
  | "tests_panel_opened"
  | "repo_search_opened";

type AnalyticsEventProps = {
  app_opened: { surface: "web" };
  login_viewed: { surface: "web" };
  login_started: { surface: "web" };
  login_succeeded: { surface: "web" };
  repos_viewed: { surface: "web"; has_repos: boolean };
  repo_viewed: { surface: "web"; provider: "github" };
  settings_viewed: { surface: "web" };
  file_history_opened: { surface: "web" };
  hotspots_opened: { surface: "web" };
  ai_panel_opened: { surface: "web" };
  tests_panel_opened: { surface: "web" };
  repo_search_opened: { surface: "web" };
};

const isBrowser = typeof window !== "undefined";

const debugAnalytics =
  isBrowser &&
  new URLSearchParams(window.location.search).has("debugAnalytics");

export function track<E extends AnalyticsEventName>(
  event: E,
  properties: AnalyticsEventProps[E],
) {
  if (!isBrowser) {
    return;
  }

  if (debugAnalytics) {
    // eslint-disable-next-line no-console
    console.log("[analytics]", event, properties);
  }

  posthog.capture(event, properties);
}
