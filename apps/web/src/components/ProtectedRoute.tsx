import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react'

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <Authenticated>
        {children}
      </Authenticated>
      <Unauthenticated>
        <UnauthenticatedRedirect />
      </Unauthenticated>
      <AuthLoading>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '1rem'
        }}>
          <div className="spinner"></div>
          <p>Checking authentication...</p>
        </div>
      </AuthLoading>
    </>
  )
}

function UnauthenticatedRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate({ to: '/' })
  }, [navigate])

  return null
}
