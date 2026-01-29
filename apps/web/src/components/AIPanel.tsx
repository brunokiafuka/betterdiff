import { useState, useEffect, type ChangeEvent } from 'react'
import { Sparkles, Trash2, Copy, Bot } from 'lucide-react'
import { useChatWithAI, useClearConversation } from '../services/ai'

// Import AI Elements components
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from '@/components/ai-elements/message'
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
  PromptInputSelect,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSelectContent,
  PromptInputSelectItem,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input'
import { Loader } from '@/components/ai-elements/loader'

// Import Tailwind CSS for AI Elements
import '../ai-elements.css'

const AI_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
]

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AIPanelProps {
  repoFullName: string
  baseSha: string | null
  headSha: string | null
  selectedFilePath?: string | null
}

export const AIPanel: React.FC<AIPanelProps> = ({
  repoFullName,
  baseSha,
  headSha,
  selectedFilePath,
}) => {
  const chatWithAI = useChatWithAI()
  const clearConversation = useClearConversation()

  // Generate conversation ID based on commits
  const conversationId = `${repoFullName}-${baseSha}-${headSha}`

  // In-memory conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'ready' | 'submitted' | 'streaming' | 'error'>('ready')
  const [streamingContent, setStreamingContent] = useState('')
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id)

  // Clear conversation when commits change
  useEffect(() => {
    setMessages([])
    setStreamingContent('')
    setInput('')
    setStatus('ready')
  }, [baseSha, headSha])

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim()
    if (!text || !baseSha || !headSha || status === 'submitted' || status === 'streaming') return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setStatus('submitted')
    setStreamingContent('')

    try {
      const result = await chatWithAI({
        repoFullName,
        baseSha,
        headSha,
        filePath: selectedFilePath || undefined,
        message: userMessage.content,
        conversationId,
      })

      if (result.success && result.response) {
        setStatus('streaming')
        const fullText = result.response
        let currentIndex = 0

        const streamInterval = setInterval(() => {
          if (currentIndex < fullText.length) {
            // Stream in chunks of 5 characters for smoother effect
            const chunkSize = 5
            setStreamingContent(fullText.substring(0, currentIndex + chunkSize))
            currentIndex += chunkSize
          } else {
            clearInterval(streamInterval)

            // Add complete message
            const assistantMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: fullText,
              timestamp: new Date(),
            }
            setMessages(prev => [...prev, assistantMessage])
            setStreamingContent('')
            setStatus('ready')
          }
        }, 20)
      } else {
        setStatus('error')
        setStreamingContent('')

        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${result.error || 'Failed to get response'}`,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, errorMessage])
        setTimeout(() => setStatus('ready'), 2000)
      }
    } catch (error: unknown) {
      console.error('Chat error:', error)
      setStatus('error')
      setStreamingContent('')

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
      setTimeout(() => setStatus('ready'), 2000)
    }
  }

  const handleClear = async () => {
    if (window.confirm('Clear conversation history?')) {
      setMessages([])
      setStreamingContent('')
      setInput('')
      await clearConversation({ conversationId })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
  }

  if (!baseSha || !headSha) {
    return (
      <div className="ai-elements-container flex flex-col h-full bg-background text-foreground">
        <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-4">
          <Sparkles size={32} className="text-primary" />
          <p className="text-muted-foreground">Select commits to start chatting with AI</p>
          <span className="text-sm text-muted-foreground/70">
            The AI will help you understand code changes and potential issues
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="ai-elements-container flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          <h3 className="text-base font-semibold">AI Assistant</h3>
        </div>
        {messages.length > 0 && (
          <button
            className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
            onClick={handleClear}
            disabled={status === 'submitted' || status === 'streaming'}
            title="Clear conversation"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Conversation */}
      <Conversation className="flex-1 min-h-0">
        <ConversationContent className="gap-6 p-4">
          {messages.length === 0 && !streamingContent && (
            <ConversationEmptyState
              icon={<Bot className="size-12 text-muted-foreground" />}
              title="Start a conversation"
              description="Ask me anything about these code changes:"
            >
              <div className="flex flex-col gap-2 mt-4 w-full max-w-sm">
                <button
                  onClick={() => handleSuggestionClick('What are the main changes in this diff?')}
                  className="px-3 py-2 text-sm text-left rounded-md bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                >
                  What are the main changes?
                </button>
                <button
                  onClick={() => handleSuggestionClick('Are there any potential bugs or issues?')}
                  className="px-3 py-2 text-sm text-left rounded-md bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                >
                  Potential bugs?
                </button>
                <button
                  onClick={() => handleSuggestionClick('What tests should I run?')}
                  className="px-3 py-2 text-sm text-left rounded-md bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                >
                  What tests to run?
                </button>
                <button
                  onClick={() => handleSuggestionClick('Explain the impact of these changes')}
                  className="px-3 py-2 text-sm text-left rounded-md bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                >
                  Impact analysis
                </button>
              </div>
            </ConversationEmptyState>
          )}

          {messages.map((message, index) => (
            <Message from={message.role} key={message.id}>
              <MessageContent>
                <MessageResponse>{message.content}</MessageResponse>
              </MessageContent>
              {message.role === 'assistant' && index === messages.length - 1 && (
                <MessageActions>
                  <MessageAction
                    onClick={() => copyToClipboard(message.content)}
                    label="Copy"
                    tooltip="Copy to clipboard"
                  >
                    <Copy className="size-3" />
                  </MessageAction>
                </MessageActions>
              )}
            </Message>
          ))}

          {/* Streaming message */}
          {streamingContent && (
            <Message from="assistant">
              <MessageContent>
                <MessageResponse>{streamingContent}</MessageResponse>
              </MessageContent>
            </Message>
          )}

          {/* Loading indicator */}
          {status === 'submitted' && !streamingContent && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader size={16} />
              <span className="text-sm">Thinking...</span>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input */}
      <div className="border-t border-border p-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            value={input}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.currentTarget.value)}
            placeholder="Ask about these changes..."
            disabled={status === 'submitted' || status === 'streaming'}
          />
          <PromptInputFooter className="justify-between border-0">
            <PromptInputTools>
              <PromptInputSelect value={selectedModel} onValueChange={setSelectedModel}>
                <PromptInputSelectTrigger>
                  <PromptInputSelectValue />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {AI_MODELS.map((model) => (
                    <PromptInputSelectItem key={model.id} value={model.id}>
                      {model.name}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            </PromptInputTools>
            <PromptInputSubmit
              status={status === 'submitted' || status === 'streaming' ? 'streaming' : 'ready'}
              disabled={!input.trim() || status === 'submitted' || status === 'streaming'}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}
