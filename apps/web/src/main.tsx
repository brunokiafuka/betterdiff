import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ConvexReactClient } from 'convex/react'
import { PostHogProvider } from 'posthog-js/react'

import { router } from './router'
import './index.css'

const convexUrl = import.meta.env.VITE_CONVEX_URL || ''
const posthogAPIKey = import.meta.env.VITE_POSTHOG_KEY
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || ''

const posthogOptions = {
  api_host: posthogHost,
  defaults: '2025-11-30',
} as const

if (!convexUrl) {
  console.error(
    'VITE_CONVEX_URL is not set. Convex will not work. Please run `npx convex dev` to get your deployment URL.',
  )
}

// Initialize Convex client - it requires a valid URL to work
const convex = new ConvexReactClient(convexUrl)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      {posthogAPIKey ? (
        <PostHogProvider apiKey={posthogAPIKey} options={posthogOptions}>
          <RouterProvider router={router} />
        </PostHogProvider>
      ) : (
        <RouterProvider router={router} />
      )}
    </ConvexAuthProvider>
  </StrictMode>,
)

