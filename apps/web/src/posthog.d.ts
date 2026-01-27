declare module 'posthog-js' {
  interface PostHog {
    capture: (event: string, properties?: Record<string, any>) => void
  }

  const posthog: PostHog
  export default posthog
}

declare module 'posthog-js/react' {
  import type { ReactNode } from 'react'

  interface PostHogOptions {
    api_host?: string
    autocapture?: boolean
    capture_pageview?: boolean
    disable_session_recording?: boolean
  }

  interface PostHogProviderProps {
    apiKey: string
    options?: PostHogOptions
    children: ReactNode
  }

  export const PostHogProvider: React.FC<PostHogProviderProps>
}

