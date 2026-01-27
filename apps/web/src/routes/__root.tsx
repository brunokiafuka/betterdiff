import { useEffect } from 'react'
import { Outlet, useLocation } from '@tanstack/react-router'
import { AppShell } from '../components/AppShell'
import { track } from '../services/analytics'

export function RootLayout() {
  const location = useLocation()
  const isLandingPage = location.pathname === '/'

  useEffect(() => {
    track('app_opened', { surface: 'web' })
  }, [])

  if (isLandingPage) {
    return <Outlet />
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
