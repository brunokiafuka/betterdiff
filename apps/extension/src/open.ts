import type { GitHubFileContext } from "./url";

const BETTERDIFF_BASE_URL = "https://betterdiff.dev";

export const buildBetterDiffUrl = (context: GitHubFileContext): string => {
  const url = new URL(
    `/repo/${context.owner}/${context.repo}`,
    BETTERDIFF_BASE_URL,
  );

  if (context.path) {
    url.searchParams.set("path", context.path);
  }

  if (context.viewType === "compare" && context.baseRef && context.headRef) {
    url.searchParams.set("oldcommit", context.baseRef);
    url.searchParams.set("newcommit", context.headRef);
  } else if (context.viewType === "repo") {
    // For repo pages, just open the repo without specific commits
    // The ref is optional (branch/tag)
  } else if (context.ref) {
    url.searchParams.set("oldcommit", context.ref);
    url.searchParams.set("newcommit", context.ref);
  }

  return url.toString();
};
