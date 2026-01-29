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

    let contextData = null;

    const conversation = conversations.get(args.conversationId) || [];
    const isFirstMessage = conversation.length === 0;

    if (isFirstMessage) {
      const [baseCommit, headCommit, comparison] = await Promise.all([
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
      ]);

      const filesToAnalyze = args.filePath
        ? comparison.files.filter((f: any) => f.path === args.filePath)
        : comparison.files;

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
        files: filesToAnalyze.slice(0, 10).map((f: any) => ({
          path: f.path,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          patch: f.patch?.substring(0, 5000) || "No diff available",
        })),
        totalFiles: filesToAnalyze.length,
      };

      const systemMessage = {
        role: "system" as const,
        content: `You are a senior software engineer helping review code changes.

Context:
- Repository: ${contextData.repository}
- Base Commit: ${contextData.baseCommit.sha} by ${contextData.baseCommit.author}
  Message: ${contextData.baseCommit.message.substring(0, 200)}
- Head Commit: ${contextData.headCommit.sha} by ${contextData.headCommit.author}
  Message: ${contextData.headCommit.message.substring(0, 200)}
- Files changed: ${contextData.totalFiles}

${
  contextData.files.length > 0
    ? `
Recent changes:
${contextData.files
  .map(
    (f: any) => `
File: ${f.path} (${f.status})
Changes: +${f.additions} -${f.deletions}
${f.patch ? `\nDiff:\n${f.patch}\n` : ""}
`,
  )
  .join("\n---\n")}
`
    : ""
}

Provide helpful, technical insights about the code changes. Be concise and actionable.`,
      };

      conversation.push(systemMessage);
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
