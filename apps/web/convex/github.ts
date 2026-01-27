import { v } from "convex/values";
import { action } from "./_generated/server";
import { Octokit } from "@octokit/rest";
import { api } from "./_generated/api";

const DEFAULT_PAGE_SIZE = 13;

type Repo = {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  private: boolean;
  type: "github";
};

// Helper to get token by username
async function getTokenByUsername(ctx: any): Promise<string | null> {
  const username = await ctx.runQuery(api.auth.getCurrentUsername, {});
  if (!username) {
    return null;
  }

  return await ctx.runQuery(api.auth.getToken, { username });
}

async function getCurrentUsername(ctx: any): Promise<string | null> {
  const username = await ctx.runQuery(api.auth.getCurrentUsername, {});
  if (!username) {
    return null;
  }
  return username;
}

export const searchRepos = action({
  args: {
    query: v.string(),
    page: v.optional(v.number()),
    perPage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const token = await getTokenByUsername(ctx);
    const username = await getCurrentUsername(ctx);

    if (!token || !username) {
      return { repos: [], nextPage: null, hasNext: false };
    }

    try {
      const octokit = new Octokit({ auth: token });

      const { data } = await octokit.search.repos({
        q: `${args.query} in:name user:${username}`,
        sort: "updated",
        per_page: args.perPage || DEFAULT_PAGE_SIZE,
        page: args.page || 1,
      });

      const hasNext = data.items.length === args.perPage;
      const nextPage = hasNext ? (args.page || 1) + 1 : null;

      return {
        repos: data.items.map((repo) => ({
          id: repo.id.toString(),
          owner: repo.owner?.login,
          name: repo.name,
          fullName: repo.full_name,
          defaultBranch: repo.default_branch,
          private: repo.owner?.user_view_type !== "public",
          type: "github" as const,
        })) as Repo[],
        nextPage,
        hasNext,
      };
    } catch (error: any) {
      return { repos: [], nextPage: null, hasNext: false };
    }
  },
});

export const fetchRepos = action({
  args: {
    page: v.optional(v.number()),
    perPage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const token = await getTokenByUsername(ctx);

    if (!token) {
      return { repos: [], nextPage: null, hasNext: false };
    }

    try {
      const octokit = new Octokit({ auth: token });

      const { data } = await octokit.repos.listForAuthenticatedUser({
        sort: "updated",
        per_page: args.perPage || DEFAULT_PAGE_SIZE,
        page: args.page || 1,
      });

      const hasNext = data.length === args.perPage;
      const nextPage = hasNext ? (args.page || 1) + 1 : null;

      let repos = data;
      if (hasNext) {
        repos = data.slice(1, args.perPage || DEFAULT_PAGE_SIZE - 1);
      }

      return {
        repos: repos.map((repo) => ({
          id: repo.id.toString(),
          owner: repo.owner.login,
          name: repo.name,
          fullName: repo.full_name,
          defaultBranch: repo.default_branch,
          private: repo.owner.user_view_type !== "public",
          type: "github" as const,
        })) as Repo[],
        nextPage,
        hasNext,
      };
    } catch (error: any) {
      return { repos: [], nextPage: null, hasNext: false };
    }
  },
});

// Get a single repository by owner and name (action - can make HTTP requests)
export const getRepo = action({
  args: { owner: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    // Get token by username
    const token = await getTokenByUsername(ctx);

    if (!token) {
      return null;
    }

    try {
      const octokit = new Octokit({ auth: token });
      const { data } = await octokit.repos.get({
        owner: args.owner,
        repo: args.name,
      });

      return {
        id: data.id.toString(),
        owner: data.owner.login,
        name: data.name,
        fullName: data.full_name,
        defaultBranch: data.default_branch,
        type: "github" as const,
      };
    } catch (error: any) {
      console.error("Failed to get repo:", error.message);
      return null;
    }
  },
});

// List branches for a repository (action - can make HTTP requests)
export const listBranches = action({
  args: { repoFullName: v.string() },
  handler: async (ctx, args) => {
    // Get token by username
    const token = await getTokenByUsername(ctx);

    if (!token) {
      return [];
    }

    const octokit = new Octokit({ auth: token });
    const [owner, repo] = args.repoFullName.split("/");

    try {
      const { data } = await octokit.repos.listBranches({
        owner,
        repo,
        per_page: 100,
      });

      return data.map((branch) => ({
        name: branch.name,
        type: "branch" as const,
        sha: branch.commit.sha,
      }));
    } catch (error: any) {
      console.error("Failed to list branches:", error.message);
      return [];
    }
  },
});

// Get repository tree (action - can make HTTP requests)
export const getRepoTree = action({
  args: { repoFullName: v.string(), ref: v.string() },
  handler: async (ctx, args) => {
    const token = await getTokenByUsername(ctx);

    if (!token) {
      return [];
    }

    const octokit = new Octokit({ auth: token });
    const [owner, repo] = args.repoFullName.split("/");

    try {
      const { data } = await octokit.git.getTree({
        owner,
        repo,
        tree_sha: args.ref,
        recursive: "true",
      });

      return data.tree.filter((item: any) => item.type === "blob");
    } catch (error: any) {
      console.error("Failed to get repo tree:", error.message);
      return [];
    }
  },
});

// Get file content (action - can make HTTP requests)
export const getFileContent = action({
  args: {
    repoFullName: v.string(),
    ref: v.string(),
    filePath: v.string(),
  },
  handler: async (ctx, args) => {
    // Get token by username
    const token = await getTokenByUsername(ctx);

    if (!token) {
      return "";
    }

    const octokit = new Octokit({ auth: token });
    const [owner, repo] = args.repoFullName.split("/");

    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: args.filePath,
        ref: args.ref,
      });

      // GitHub returns base64 encoded content
      if ("content" in data && data.content) {
        // Use atob for base64 decoding (works in Convex runtime)
        // GitHub content may have newlines, so we need to remove them first
        const base64Content = data.content.replace(/\n/g, "");
        const content = decodeURIComponent(
          atob(base64Content)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join(""),
        );
        return content;
      }

      return "";
    } catch (error: any) {
      console.error("Failed to fetch file content:", error.message);
      return "";
    }
  },
});

export const compareRefs = action({
  args: {
    repoFullName: v.string(),
    base: v.string(),
    head: v.string(),
  },
  handler: async (ctx, args) => {
    const token = await getTokenByUsername(ctx);

    if (!token) {
      return { files: [], commits: [] };
    }

    const octokit = new Octokit({ auth: token });
    const [owner, repo] = args.repoFullName.split("/");

    try {
      const { data } = await octokit.repos.compareCommits({
        owner,
        repo,
        base: args.base,
        head: args.head,
      });

      return {
        files:
          data.files?.map((file) => {
            // Map GitHub status to our FileChange status
            let status: "added" | "modified" | "deleted" | "renamed" =
              "modified";
            if (file.status === "added") status = "added";
            else if (file.status === "removed") status = "deleted";
            else if (file.status === "renamed") status = "renamed";
            else if (file.status === "modified" || file.status === "changed")
              status = "modified";

            return {
              path: file.filename,
              status,
              additions: file.additions,
              deletions: file.deletions,
              oldSha: status !== "added" ? data.base_commit.sha : undefined,
              newSha:
                status !== "deleted"
                  ? data.commits[data.commits.length - 1]?.sha
                  : undefined,
              patch: file.patch,
            };
          }) || [],
        commits: data.commits.map((commit) => ({
          sha: commit.sha,
          author: {
            name: commit.commit.author?.name || "Unknown",
            email: commit.commit.author?.email || "",
            date: commit.commit.author?.date || "",
          },
          message: commit.commit.message,
        })),
      };
    } catch (error: any) {
      console.error("Failed to compare refs:", error.message);
      return { files: [], commits: [] };
    }
  },
});

export const getFileHistory = action({
  args: {
    repoFullName: v.string(),
    filePath: v.string(),
    ref: v.string(),
  },
  handler: async (ctx, args) => {
    const token = await getTokenByUsername(ctx);

    if (!token) {
      return [];
    }

    const octokit = new Octokit({ auth: token });
    const [owner, repo] = args.repoFullName.split("/");

    try {
      const { data } = await octokit.repos.listCommits({
        owner,
        repo,
        path: args.filePath,
        sha: args.ref,
        per_page: 100,
      });

      return data.map((commit) => ({
        sha: commit.sha,
        author: {
          name: commit.commit.author?.name || "Unknown",
          email: commit.commit.author?.email || "",
          date: commit.commit.author?.date || "",
        },
        message: commit.commit.message,
        url: commit.html_url,
      }));
    } catch (error: any) {
      console.error("Failed to get file history:", error.message);
      return [];
    }
  },
});

// Get commit details (action - can make HTTP requests)
export const getCommit = action({
  args: {
    repoFullName: v.string(),
    sha: v.string(),
  },
  handler: async (ctx, args) => {
    // Get token by username
    const token = await getTokenByUsername(ctx);

    if (!token) {
      return null;
    }

    const octokit = new Octokit({ auth: token });
    const [owner, repo] = args.repoFullName.split("/");

    try {
      const { data } = await octokit.repos.getCommit({
        owner,
        repo,
        ref: args.sha,
      });

      // Extract PR number from commit message
      const prMatch = data.commit.message.match(/#(\d+)/);
      const prNumber = prMatch ? parseInt(prMatch[1]) : undefined;

      return {
        sha: data.sha,
        shortSha: data.sha.substring(0, 7),
        message: data.commit.message,
        prNumber,
        author: {
          name: data.commit.author?.name || "Unknown",
          email: data.commit.author?.email || "",
          date: data.commit.author?.date || "",
        },
        committer: {
          name: data.commit.committer?.name || "Unknown",
          email: data.commit.committer?.email || "",
          date: data.commit.committer?.date || "",
        },
        stats: {
          additions: data.stats?.additions || 0,
          deletions: data.stats?.deletions || 0,
          total: data.stats?.total || 0,
        },
        files:
          data.files?.map((file: any) => ({
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes,
          })) || [],
        url: data.html_url,
      };
    } catch (error: any) {
      console.error("Failed to get commit:", error.message);
      return null;
    }
  },
});

// Get blame (action - placeholder, will implement with GraphQL later)
export const getBlame = action({
  args: {
    repoFullName: v.string(),
    ref: v.string(),
    path: v.string(),
  },
  handler: async () => {
    // TODO: Implement with GitHub GraphQL API
    return [];
  },
});
