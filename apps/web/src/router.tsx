import { createRouter, createRootRoute, createRoute } from '@tanstack/react-router'
import { RootLayout } from './routes/__root'
import { IndexRoute } from './routes/index'
import { SettingsRoute } from './routes/settings'
import { ReposRoute } from './routes/repos'
import { RepoViewerRoute } from './routes/repo.$owner.$name'

// Create root route
const rootRoute = createRootRoute({
  component: RootLayout,
})

// Create index route
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexRoute,
})

// Create settings route
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsRoute,
})

// Create repos route
const reposRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/repos',
  component: ReposRoute,
})

// Create repo viewer route with search params
const repoViewerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/repo/$owner/$name',
  component: RepoViewerRoute,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      path: typeof search.path === 'string' ? search.path : undefined,
      oldcommit: typeof search.oldcommit === 'string' ? search.oldcommit : undefined,
      newcommit: typeof search.newcommit === 'string' ? search.newcommit : undefined,
    }
  },
})

// Create the route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  settingsRoute,
  reposRoute,
  repoViewerRoute,
])

// Create the router
export const router = createRouter({ routeTree })

// Register router types
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
