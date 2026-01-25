import React, { useState, useEffect } from 'react'
import { Settings, Sparkles } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { RepoSearchModal } from './RepoSearchModal'
import './AppShell.css'

interface AppShellProps {
  children: React.ReactNode
  onSettingsClick?: () => void
}

export const AppShell: React.FC<AppShellProps> = ({ children, onSettingsClick }) => {
  const { currentRepo, showBlame, toggleBlame, setRepo, setRefs } = useAppStore()
  const [showModal, setShowModal] = useState(false)
  const [repos, setRepos] = useState<any[]>([])
  const [recentRepos, setRecentRepos] = useState<any[]>([])

  useEffect(() => {
    const loadRepos = async () => {
      try {
        const repoList = await window.electronAPI.github.fetchRepos()
        setRepos(repoList)
      } catch (err) {
        console.error('Failed to load repos:', err)
      }
    }

    const loadRecentRepos = async () => {
      try {
        const config = await window.electronAPI.config.read()
        const recent = config?.recentRepos || []
        setRecentRepos(recent.slice(0, 5))
      } catch (err) {
        console.error('Failed to load recent repos:', err)
      }
    }

    if (showModal) {
      loadRepos()
      loadRecentRepos()
    }
  }, [showModal])

  const handleSelectRepo = async (repo: any) => {
    setShowModal(false)
    try {
      setRepo(repo)

      // Update recent repos in config
      try {
        const config = await window.electronAPI.config.read() || {}
        const recent = config.recentRepos || []
        const filtered = recent.filter((r: any) => r.fullName !== repo.fullName)
        const updated = [{ ...repo, lastAccessed: new Date().toISOString() }, ...filtered].slice(0, 10)
        await window.electronAPI.config.write({ ...config, recentRepos: updated })
        setRecentRepos(updated.slice(0, 5))
      } catch (err) {
        console.error('Failed to update recent repos:', err)
      }

      // Fetch branches and set default ref
      const branches = await window.electronAPI.github.listBranches(repo.fullName)
      if (branches.length > 0) {
        const defaultBranch = branches.find(b => b.name === repo.defaultBranch) || branches[0]
        setRefs(defaultBranch, defaultBranch)
      }
    } catch (err: any) {
      console.error('Failed to select repo:', err)
    }
  }

  return (
    <div className="app-shell">
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="repo-selector">
            {currentRepo ? (
              <button
                className="repo-name-btn"
                onClick={() => setShowModal(true)}
                title="Click to change repository"
              >
                {currentRepo.fullName}
              </button>
            ) : (
              <button
                className="btn-select-repo"
                onClick={() => setShowModal(true)}
              >
                Select Repository
              </button>
            )}
          </div>
        </div>

        <div className="top-bar-right">
          {currentRepo && (
            <>
              <button 
                className="btn-action btn-icon" 
                title="Explain (⌘E)"
                aria-label="Explain"
              >
                <Sparkles size={18} />
              </button>
            </>
          )}
          <button
            className="btn-action btn-icon"
            onClick={onSettingsClick}
            title="Settings"
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      <div className="app-content">
        {children}
      </div>

      {showModal && repos.length > 0 && (
        <RepoSearchModal
          repos={repos}
          recentRepos={recentRepos}
          onSelect={handleSelectRepo}
          onClose={() => setShowModal(false)}
          onRemoveRecent={async (repo) => {
            try {
              const config = await window.electronAPI.config.read() || {}
              const recent = (config.recentRepos || []).filter((r: any) => r.fullName !== repo.fullName)
              await window.electronAPI.config.write({ ...config, recentRepos: recent })
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
