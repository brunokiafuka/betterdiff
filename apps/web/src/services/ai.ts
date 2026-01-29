// AI service that calls Convex AI functions
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

export const useChatWithAI = () => {
  return useAction(api.ai.chatWithAI);
};

export const useClearConversation = () => {
  return useAction(api.ai.clearConversation);
};
