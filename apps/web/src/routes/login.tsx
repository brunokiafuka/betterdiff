import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react'
import { Github } from 'lucide-react'
import iconImage from '../assets/icon.png'
import './Auth.css'
import { Footer } from '../components/Footer'

function AuthenticatedRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate({ to: '/repos' })
  }, [navigate])

  return null
}

export function LoginRoute() {
  const { signIn } = useAuthActions()

  const handleSignIn = () => {
    void signIn('github')
  }

  return (
    <>
      <Authenticated>
        <AuthenticatedRedirect />
      </Authenticated>
      <Unauthenticated>
        <div className="auth-page">
          <div className="auth-container">
            <div className="auth-header">
              <div className="auth-logo">
                <img src={iconImage} alt="betterdiff" className="auth-logo-img" />
              </div>
              <h1 className="auth-title"><code>betterdiff</code></h1>
              <p className="auth-subtitle">
                Uncover the story behind your code. Next-gen Git diffs, redefined.
              </p>
            </div>

            <div className="auth-card">
              <div className="auth-card-header">
                <h2>Get Started</h2>
                <p className="auth-card-description">
                  Sign in with your GitHub account to access your repositories
                </p>
              </div>

              <button
                className="btn-github-signin"
                onClick={handleSignIn}
              >
                <Github size={20} />
                <span>Sign in with GitHub</span>
              </button>
            </div>

            <div className="auth-footer">
              <p>
                By signing in, you agree to grant betterdiff access to your repositories
              </p>
            </div>
            <Footer />
          </div>

        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="auth-page">
          <div className="auth-loading">
            <div className="spinner"></div>
            <p>Checking authentication...</p>
          </div>
        </div>
      </AuthLoading>
    </>
  )
}
