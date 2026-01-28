import React, { useState, } from 'react'
import { useSignals } from '@preact/signals-react/runtime'
import { Settings, LogOut, FolderOpen } from 'lucide-react'
import { useNavigate, Link, useLocation } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useAuthActions } from '@convex-dev/auth/react'
import { currentRepo } from '../stores/appStore'
import { BranchSelector } from './BranchSelector'
import './AppShell.css'
import { track } from '../services/analytics'
import { useWindowInfo } from './WindowProvider'

interface AppShellProps {
  children: React.ReactNode
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  useSignals()
  const navigate = useNavigate()
  const location = useLocation()
  const repo = currentRepo.value
  const { isMobile } = useWindowInfo()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const currentUser = useQuery(api.auth.getCurrentUser)
  const { signOut } = useAuthActions()

  const isAuthPage = location.pathname === '/login'
  const isRepoViewerPage = location.pathname.startsWith('/repo/')


  const handleSettingsClick = () => {
    navigate({ to: '/settings' })
  }

  const handleRepoNameClick = () => {
    navigate({ to: '/repos' })
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
            {isRepoViewerPage && !isMobile && (
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
    </div>
  )
}
