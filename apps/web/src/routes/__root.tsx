import { Outlet, useLocation } from '@tanstack/react-router'
import { AppShell } from '../components/AppShell'


export function RootLayout() {
  const location = useLocation()
  const isLandingPage = location.pathname === '/'

  if (isLandingPage) {
    return <Outlet />
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
