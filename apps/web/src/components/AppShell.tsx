import React, { useState, useEffect } from 'react'
import { useSignals } from '@preact/signals-react/runtime'
import { Settings, Sparkles, Flame, LogOut, FolderOpen } from 'lucide-react'
import { useNavigate, Link, useLocation } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useAuthActions } from '@convex-dev/auth/react'
import { currentRepo, setRepo } from '../stores/appStore'
import { RepoSearchModal } from './RepoSearchModal'
import { BranchSelector } from './BranchSelector'
import { useFetchRepos } from '../services/github'
import './AppShell.css'
import { track } from '../services/analytics'

interface AppShellProps {
  children: React.ReactNode
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  useSignals()
  const navigate = useNavigate()
  const location = useLocation()
  const repo = currentRepo.value
  const [showModal, setShowModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const fetchRepos = useFetchRepos()
  const [repos, setRepos] = useState<any[]>([])
  const [recentRepos, setRecentRepos] = useState<any[]>([])
  const currentUser = useQuery(api.auth.getCurrentUser)
  const { signOut } = useAuthActions()


  const isAuthPage = location.pathname === '/login'
  const isRepoViewerPage = location.pathname.startsWith('/repo/')

  useEffect(() => {
    if (showModal && repos.length === 0) {
      const loadRepos = async () => {
        try {
          const result = await fetchRepos({})
          setRepos(result || [])
        } catch (err) {
          console.error('Failed to load repos:', err)
          setRepos([])
        }
      }
      loadRepos()
    }
  }, [showModal, fetchRepos, repos.length])

  // Keyboard shortcut: Cmd+A to open AI panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        if (repo) {
          window.dispatchEvent(new CustomEvent('open-ai-panel'))
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [repo])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('whodidit_recent_repos')
      if (stored) {
        const recent = JSON.parse(stored)
        setRecentRepos(recent.filter((r: any) => r.type === 'github').slice(0, 5))
      }
    } catch (err) {
      console.error('Failed to load recent repos:', err)
    }
  }, [])

  const handleSelectRepo = async (selectedRepo: any) => {
    setShowModal(false)
    try {
      // Ensure repo has type
      if (!selectedRepo.type) {
        selectedRepo.type = 'github'
      }

      setRepo(selectedRepo)

      // Update recent repos in localStorage
      try {
        const stored = localStorage.getItem('whodidit_recent_repos') || '[]'
        const recent = JSON.parse(stored)
        const filtered = recent.filter((r: any) => r.fullName !== selectedRepo.fullName)
        const updated = [{ ...selectedRepo, lastAccessed: new Date().toISOString() }, ...filtered].slice(0, 10)
        localStorage.setItem('whodidit_recent_repos', JSON.stringify(updated))
        setRecentRepos(updated.slice(0, 5))
      } catch (err) {
        console.error('Failed to update recent repos:', err)
      }

      // Fetch branches and set default ref
      // This will be handled by the BranchSelector component when it loads
      // Navigate to the repo viewer
      navigate({
        to: '/repo/$owner/$name',
        params: { owner: selectedRepo.owner, name: selectedRepo.name }
      } as any)
    } catch (err: any) {
      console.error('Failed to select repo:', err)
    }
  }

  const handleSettingsClick = () => {
    navigate({ to: '/settings' })
  }

  const handleRepoNameClick = () => {
    setShowModal(true)
    track('repo_search_opened', { surface: 'web' })
  }

  const handleLogout = async () => {
    await signOut()
    navigate({ to: '/' })
  }

  return (
    <div className="app-shell">
      {!isAuthPage && (
        <div className="top-bar">
          <div className="top-bar-left">
            <Link to="/repos" className="app-logo" title="betterdiff">
              <code>betterdiff</code>
            </Link>
            {isRepoViewerPage && (
              <>
                <Link to="/repos" className="btn-repos" title="Back to Repositories">
                  <FolderOpen size={18} />
                  <span>Repos</span>
                </Link>
                <div className="repo-selector">
                  {repo ? (
                    <>
                      <button
                        className="repo-name-btn"
                        onClick={handleRepoNameClick}
                        title="Click to change repository"
                      >
                        {repo.fullName}
                      </button>
                      <BranchSelector />
                    </>
                  ) : (
                    <Link to="/repos" className="btn-select-repo">
                      Select Repository
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="top-bar-right">
            {isRepoViewerPage && repo && (
              <>
                <button
                  className="btn-action btn-icon"
                  onClick={() => {
                    track('hotspots_opened', { surface: 'web' })
                    window.dispatchEvent(new CustomEvent('open-hotspots-panel'))
                  }}
                  title="Hotspots (Frequently Changed Files)"
                  aria-label="Hotspots"
                >
                  <Flame size={18} />
                </button>
                <button
                  className="btn-action btn-icon"
                  onClick={() => {
                    track('ai_panel_opened', { surface: 'web' })
                    window.dispatchEvent(new CustomEvent('open-ai-panel'))
                  }}
                  title="AI Analysis (⌘A)"
                  aria-label="AI Analysis"
                >
                  <Sparkles size={18} />
                </button>
              </>
            )}
            {currentUser && (
              <div
                className="user-profile"
                onMouseEnter={() => setShowUserMenu(true)}
                onMouseLeave={() => setShowUserMenu(false)}
              >
                <div className="user-avatar-wrapper">
                  {currentUser.image ? (
                    <img
                      src={currentUser.image}
                      alt={currentUser.username || 'User'}
                      className="user-avatar"
                    />
                  ) : (
                    <div className="user-avatar-placeholder">
                      {(currentUser.username || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {currentUser.username && (
                  <span className="user-name">{currentUser.username}</span>
                )}
                {showUserMenu && (
                  <div
                    className="user-menu"
                    onMouseEnter={() => setShowUserMenu(true)}
                    onMouseLeave={() => setShowUserMenu(false)}
                  >
                    <button
                      className="user-menu-item"
                      onClick={handleSettingsClick}
                    >
                      <Settings size={16} />
                      <span>Settings</span>
                    </button>
                    <button
                      className="user-menu-item user-menu-item-danger"
                      onClick={handleLogout}
                    >
                      <LogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="app-content">
        {children}
      </div>

      {showModal && (
        <RepoSearchModal
          repos={repos}
          recentRepos={recentRepos}
          onSelect={handleSelectRepo}
          onClose={() => setShowModal(false)}
          onRemoveRecent={(repo) => {
            try {
              const stored = localStorage.getItem('whodidit_recent_repos') || '[]'
              const recent = JSON.parse(stored).filter((r: any) => r.fullName !== repo.fullName)
              localStorage.setItem('whodidit_recent_repos', JSON.stringify(recent))
              setRecentRepos(recent.slice(0, 5))
            } catch (err) {
              console.error('Failed to remove recent repo:', err)
            }
          }}
        />
      )}
    </div>
  )
}
