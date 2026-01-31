import { v } from "convex/values";
import { action } from "./_generated/server";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { api } from "./_generated/api";

async function getTokenByUsername(ctx: any): Promise<string | null> {
  const username = await ctx.runQuery(api.auth.getCurrentUsername, {});
  if (!username) {
    return null;
  }

  return await ctx.runQuery(api.auth.getToken, { username });
}

// Store conversations in memory (for now)
// In production, you'd store this in Convex DB
const conversations = new Map<
  string,
  Array<{ role: "user" | "assistant" | "system"; content: string }>
>();

export const chatWithAI = action({
  args: {
    repoFullName: v.string(),
    baseSha: v.string(),
    headSha: v.string(),
    filePath: v.optional(v.string()),
    message: v.string(),
    conversationId: v.string(),
  },
  handler: async (ctx, args) => {
    const token = await getTokenByUsername(ctx);
    if (!token) {
      throw new Error("Not authenticated");
    }

    const conversation = conversations.get(args.conversationId) || [];
    const isFirstMessage = conversation.length === 0;

    // Always fetch context to keep it up to date
    let contextData: any;
    {
      const [baseCommit, headCommit, comparison, pullRequests] =
        await Promise.all([
          ctx.runAction(api.github.getCommit, {
            repoFullName: args.repoFullName,
            sha: args.baseSha,
          }),
          ctx.runAction(api.github.getCommit, {
            repoFullName: args.repoFullName,
            sha: args.headSha,
          }),
          ctx.runAction(api.github.compareRefs, {
            repoFullName: args.repoFullName,
            base: args.baseSha,
            head: args.headSha,
          }),
          ctx.runAction(api.github.getPullRequestsForCommit, {
            repoFullName: args.repoFullName,
            sha: args.headSha,
          }),
        ]);

      // Use commit files if available (more accurate), otherwise fall back to comparison
      const commitFiles =
        headCommit?.files?.map((f: any) => ({
          path: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          changes: f.changes,
          patch: null, // Commit API doesn't include patches
        })) || [];

      const comparisonFiles = comparison.files || [];

      // Merge commit files with patches from comparison
      // Use commit files as the source of truth for the file list
      let allFiles = commitFiles;
      
      if (commitFiles.length > 0 && comparisonFiles.length > 0) {
        // Enrich commit files with patches from comparison
        allFiles = commitFiles.map((commitFile: any) => {
          const comparisonFile = comparisonFiles.find(
            (cf: any) => cf.filename === commitFile.path || cf.path === commitFile.path
          );
          return {
            ...commitFile,
            patch: comparisonFile?.patch || null,
          };
        });
      } else if (commitFiles.length === 0) {
        // Fall back to comparison files if no commit files
        allFiles = comparisonFiles.map((f: any) => ({
          path: f.filename || f.path,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          changes: f.changes,
          patch: f.patch,
        }));
      }

      console.log("commitFiles:", commitFiles.length, "files");
      console.log("comparisonFiles:", comparisonFiles.length, "files");
      console.log("allFiles:", allFiles.length, "files");
      console.log("args.filePath:", args.filePath);

      // Always include all files for context, but note which file is selected
      const filesToAnalyze = allFiles;
      const selectedFile = args.filePath
        ? allFiles.find((f: any) => f.path === args.filePath)
        : null;

      console.log("filesToAnalyze:", filesToAnalyze.length, "files");
      console.log("selectedFile:", selectedFile?.path || "none");

      contextData = {
        repository: args.repoFullName,
        baseCommit: {
          sha: baseCommit?.shortSha || args.baseSha.substring(0, 7),
          author: baseCommit?.author?.name || "Unknown",
          message: baseCommit?.message || "",
          date: baseCommit?.author?.date || "",
        },
        headCommit: {
          sha: headCommit?.shortSha || args.headSha.substring(0, 7),
          author: headCommit?.author?.name || "Unknown",
          message: headCommit?.message || "",
          date: headCommit?.author?.date || "",
        },
        pullRequests: pullRequests.map((pr: any) => ({
          number: pr.number,
          title: pr.title,
          state: pr.state,
          url: pr.url,
          author: pr.author,
        })),
        selectedFile: selectedFile?.path || null,
        files: filesToAnalyze.slice(0, 20).map((f: any) => ({
          path: f.path,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          // Include full patch for selected file, truncated for others
          patch:
            f.path === selectedFile?.path
              ? f.patch?.substring(0, 10000) || "No diff available"
              : f.patch?.substring(0, 1000) || "No diff available",
        })),
        totalFiles: filesToAnalyze.length,
      };

      console.log("contextData:", contextData);

      const systemMessage = {
        role: "system" as const,
        content: `You are a senior software engineer helping review code changes.

Context:
- Repository: ${contextData.repository}
- Base Commit: ${contextData.baseCommit.sha} by ${contextData.baseCommit.author}
  Message: ${contextData.baseCommit.message.substring(0, 200)}
- Head Commit: ${contextData.headCommit.sha} by ${contextData.headCommit.author}
  Message: ${contextData.headCommit.message.substring(0, 200)}
${contextData.selectedFile ? `- Currently viewing: ${contextData.selectedFile}\n` : ""}${
  contextData.pullRequests.length > 0
    ? `
- Pull Requests:
${contextData.pullRequests
  .map(
    (pr: any) => `  #${pr.number}: ${pr.title} (${pr.state}) by ${pr.author}
  URL: ${pr.url}`,
  )
  .join("\n")}
`
    : ""
}
${
  contextData.files.length > 0
    ? `
Files Changed (${contextData.totalFiles} total):
${contextData.files
  .map(
    (f: any, index: any) => `
${index + 1}. ${f.path}${f.path === contextData.selectedFile ? " ⭐ (currently viewing)" : ""} (${f.status})
   Changes: +${f.additions} -${f.deletions}${f.patch && f.patch !== "No diff available" ? `\n   Diff:\n${f.patch}\n` : ""}`,
  )
  .join("\n")}
`
    : ""
}

Instructions:
- When asked "which files were changed", list ALL ${contextData.totalFiles} files shown above
- The user is ${contextData.selectedFile ? `currently viewing ${contextData.selectedFile}` : "viewing all files"}
- Provide helpful, technical insights about the code changes
- Be concise and actionable
- Use markdown formatting for code blocks and file paths`,
      };

      // Update or add system message
      if (isFirstMessage) {
        conversation.push(systemMessage);
      } else {
        // Update the existing system message (always at index 0)
        if (conversation[0]?.role === "system") {
          conversation[0] = systemMessage;
        } else {
          // If somehow there's no system message, add it at the beginning
          conversation.unshift(systemMessage);
        }
      }
    }

    conversation.push({
      role: "user",
      content: args.message,
    });

    // Store updated conversation
    conversations.set(args.conversationId, conversation);

    try {
      const result = await streamText({
        model: openai("gpt-4o-mini"),
        messages: conversation,
      });

      let fullResponse = "";
      const chunks: string[] = [];

      for await (const chunk of result.textStream) {
        fullResponse += chunk;
        chunks.push(chunk);
      }

      conversation.push({
        role: "assistant",
        content: fullResponse,
      });
      conversations.set(args.conversationId, conversation);

      return {
        success: true,
        response: fullResponse,
        chunks,
        messageCount: conversation.length - 1,
      };
    } catch (error: any) {
      console.error("AI chat failed:", error);
      return {
        success: false,
        error: error.message || "Failed to chat with AI",
        response: null,
        chunks: [],
        messageCount: conversation.length - 1,
      };
    }
  },
});

export const clearConversation = action({
  args: {
    conversationId: v.string(),
  },
  handler: async (_ctx, args) => {
    conversations.delete(args.conversationId);
    return { success: true };
  },
});
