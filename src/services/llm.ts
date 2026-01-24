// LLM service for explanations
import { Explanation } from '../types'

export class LLMService {
  async explainChange(context: {
    diff: string
    commitMessages?: string[]
    filePath: string
  }): Promise<Explanation> {
    return await window.electronAPI.llm.explain(context)
  }
}

export const llmService = new LLMService()
