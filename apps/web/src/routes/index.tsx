import { useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Authenticated, Unauthenticated, useQuery } from 'convex/react'
import { GitBranch, GitCommit, FileCode, Github, } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import iconImage from '../assets/icon.png'
import diffImage from '../assets/diff.png'
import './Landing.css'
import { Footer } from '../components/Footer'
import { FlickeringGrid } from '../components/FlickeringGrid'

function AuthenticatedRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    // Only redirect if this navigation was triggered by an auth flow.
    // We detect that via a stored redirect path set before calling signIn().
    const redirectPath = sessionStorage.getItem('authRedirect')
    if (!redirectPath) {
      // No pending auth redirect – user likely just visited `/` directly,
      // so keep them on the marketing page instead of forcing `/repos`.
      return
    }

    sessionStorage.removeItem('authRedirect')
    navigate({ to: redirectPath as any, replace: true })
  }, [navigate])

  return null
}

function LandingUserNav() {
  const currentUser = useQuery(api.auth.getCurrentUser)

  if (!currentUser) {
    return null
  }

  const displayName =
    currentUser.username ||
    currentUser.email ||
    'Your repos'

  const initial =
    (currentUser.username || currentUser.email || 'U').charAt(0).toUpperCase()

  return (
    <Link to="/repos" className="landing-nav-cta landing-nav-user">
      {currentUser.image ? (
        <img
          src={currentUser.image}
          alt={displayName}
          className="landing-nav-user-avatar"
        />
      ) : (
        <div className="landing-nav-user-avatar placeholder">
          {initial}
        </div>
      )}
      <code className="landing-nav-user-name">@{displayName}</code>
    </Link>
  )
}

export function IndexRoute() {
  useEffect(() => {
    // Enable scrolling for landing page
    const root = document.getElementById('root')
    if (root) {
      root.style.overflow = 'auto'
      root.style.height = 'auto'
      root.style.minHeight = '100vh'
    }
    document.body.style.overflow = 'auto'
    document.documentElement.style.overflow = 'auto'

    return () => {
      // Restore overflow hidden when leaving landing page
      if (root) {
        root.style.overflow = 'hidden'
        root.style.height = '100vh'
        root.style.minHeight = ''
      }
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    }
  }, [])

  return (
    <>
      <Authenticated>
        <AuthenticatedRedirect />
      </Authenticated>
      <div className="landing-page">
        <FlickeringGrid
          squareSize={4}
          gridGap={6}
          color="rgba(107, 114, 128, 0.5)"
          maxOpacity={0.3}
          flickerChance={0.1}
          className="landing-grid-bg"
        />
        {/* Navigation */}
        <nav className="landing-nav">
          <div className="landing-nav-container">
            <Link to="/" className="landing-nav-logo">
              <img src={iconImage} alt="betterdiff" />
              <code>betterdiff</code>
            </Link>
            <div className="landing-nav-links">
              <a href="https://github.com/brunokiafuka/betterdiff" target="_blank" rel="noopener noreferrer" className="landing-nav-link">
                <Github size={16} style={{ marginRight: 6 }} />
                GitHub
              </a>
              <Authenticated>
                <LandingUserNav />
              </Authenticated>
              <Unauthenticated>
                <Link to="/login" className="landing-nav-cta">
                  Get Started
                </Link>
              </Unauthenticated>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="landing-hero">
          <div className="landing-hero-content">
            <div className="landing-badge">
              <span className="landing-badge-dot"></span>
              <span>Now in public beta</span>
            </div>
            <h1>
              The modern way to<br />
              <span>understand your code</span>
            </h1>
            <p className="landing-hero-subtitle">
              Next-generation Git diffs that tell the story behind every change.
              Visualize commits, track file history, and navigate your codebase like never before.
            </p>
          </div>
        </section>

        {/* Demo Preview */}
        <section className="landing-demo">
          <div className="landing-demo-window">
            <div className="landing-demo-header">
              <span className="landing-demo-dot"></span>
              <span className="landing-demo-dot"></span>
              <span className="landing-demo-dot"></span>
            </div>
            <div className="landing-demo-content">
              <img
                src={diffImage}
                alt="Beautiful diff visualization"
                className="landing-demo-image"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="landing-features">
          <div className="landing-section-header">
            <p className="landing-section-label">Features</p>
            <h2 className="landing-section-title">Everything you need to understand changes</h2>
            <p className="landing-section-subtitle">
              Powerful tools designed for developers who care about code quality and maintainability.
            </p>
          </div>
          <div className="landing-features-grid">
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <GitBranch size={24} />
              </div>
              <h3 className="landing-feature-title">Branch Comparison</h3>
              <p className="landing-feature-description">
                Compare any two branches or commits side by side. See exactly what changed and why.
              </p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <GitCommit size={24} />
              </div>
              <h3 className="landing-feature-title">Commit History</h3>
              <p className="landing-feature-description">
                Navigate through your project's history with a beautiful, intuitive timeline view.
              </p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <FileCode size={24} />
              </div>
              <h3 className="landing-feature-title">File Explorer</h3>
              <p className="landing-feature-description">
                Browse your repository structure and see changes at a glance with visual indicators.
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="landing-stats">
          <div className="landing-stats-grid">
            <div className="landing-stat">
              <span className="landing-stat-value">∞</span>
              <span className="landing-stat-label">Repositories Supported</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat-value">0ms</span>
              <span className="landing-stat-label">Learning Curve</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat-value">100%</span>
              <span className="landing-stat-label">Free to Use</span>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="landing-cta">
          <div className="landing-cta-content">
            <h2>Ready to see your code differently?</h2>
            <p>
              Join developers who are already using betterdiff to understand their codebases better.
            </p>
            <Link to="/login" className="landing-btn-primary">
              <Github size={20} />
              Get Started for Free
            </Link>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </div>
    </>
  )
}
