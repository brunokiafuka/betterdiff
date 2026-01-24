import { useState, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import { RepoSearchModal } from './RepoSearchModal'
import { Settings, FolderOpen, Search, Folder } from 'lucide-react'
import './Welcome.css'

export const Welcome: React.FC = () => {
  const [configExists, setConfigExists] = useState<boolean | null>(null)
  const [repos, setRepos] = useState<any[]>([])
  const [recentRepos, setRecentRepos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const { setRepo, setRefs } = useAppStore()

  useEffect(() => {
    const checkConfig = async () => {
      const exists = await window.electronAPI.config.exists()
      setConfigExists(exists)

      // If config exists, load recent repos and all repos
      if (exists) {
        await loadRecentRepos()
        await loadRepos()
      }
    }
    checkConfig()
  }, [])

  // Keyboard shortcut: Cmd+K to open repo modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && configExists && repos.length > 0) {
        e.preventDefault()
        setShowModal(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [configExists, repos.length])

  const loadRecentRepos = async () => {
    try {
      const config = await window.electronAPI.config.read()
      const recent = config?.recentRepos || []
      setRecentRepos(recent.slice(0, 5)) // Last 5
    } catch (err) {
      console.error('Failed to load recent repos:', err)
    }
  }

  const loadRepos = async () => {
    setLoading(true)
    setError(null)
    try {
      const repoList = await window.electronAPI.github.fetchRepos()
      setRepos(repoList)
    } catch (err: any) {
      setError(err.message || 'Failed to load repositories')
      console.error('Failed to load repos:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectRepo = async (repo: any) => {
    setShowModal(false) // Close modal when repo is selected
    setLoading(true)
    setError(null)
    try {
      setRepo(repo)

      // Update recent repos in config
      try {
        const config = await window.electronAPI.config.read() || {}
        const recent = config.recentRepos || []
        // Remove if already exists
        const filtered = recent.filter((r: any) => r.fullName !== repo.fullName)
        // Add to front
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
      setError(err.message || 'Failed to select repository')
      console.error('Failed to select repo:', err)
    } finally {
      setLoading(false)
    }
  }

  if (configExists === null) {
    return (
      <div className="welcome">
        <div className="welcome-content">
          <div className="spinner"></div>
          <p>Checking configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="welcome">
      <div className="welcome-content">
        <div className="welcome-header">
          <h1 className="welcome-title">WhoDidIt</h1>
          <p className="welcome-subtitle">Forensic diff viewer for Git repositories</p>
        </div>

        {!configExists ? (
          <div className="welcome-setup">
            <p className="setup-description">
              Configure GitHub authentication to get started.
            </p>
            <div className="welcome-actions">
              <button
                className="welcome-action-btn"
                onClick={() => {
                  // Trigger settings - we'll need to pass this up or use a store
                  window.dispatchEvent(new CustomEvent('open-settings'))
                }}
              >
                <Settings size={16} />
                <span>Open Settings</span>
              </button>
            </div>
            <p className="setup-hint">
              Click <strong>Settings</strong> in the top-right corner to add your GitHub token
            </p>
          </div>
        ) : (
          <div className="welcome-ready">
            <div className="welcome-actions">
              <button
                className="welcome-action-btn"
                onClick={() => setShowModal(true)}
                disabled={loading || repos.length === 0}
              >
                <FolderOpen size={16} />
                <span>Open Repository</span>
              </button>
            </div>

            {loading && repos.length === 0 && recentRepos.length === 0 ? (
              <div className="repo-loading">
                <div className="spinner"></div>
                <p>Loading repositories...</p>
              </div>
            ) : error ? (
              <div className="repo-error">
                <p className="error-message">{error}</p>
                <button className="btn-retry" onClick={loadRepos}>
                  Retry
                </button>
              </div>
            ) : recentRepos.length > 0 ? (
              <div className="recent-repos">
                <div className="recent-repos-header">
                  <span className="recent-repos-title">Recent repositories</span>
                  <button
                    className="recent-repos-view-all"
                    onClick={() => setShowModal(true)}
                  >
                    View all ({repos.length})
                  </button>
                </div>
                <div className="recent-repos-list">
                  {recentRepos.map((repo) => (
                    <div
                      key={repo.id || repo.fullName}
                      className="recent-repo-item"
                      onClick={() => handleSelectRepo(repo)}
                    >
                      <span className="repo-item-name">{repo.fullName}</span>
                      <span className="repo-item-path">{repo.owner}/{repo.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : repos.length > 0 ? (
              <div className="recent-repos">
                <div className="recent-repos-header">
                  <span className="recent-repos-title">Repositories</span>
                  <button
                    className="recent-repos-view-all"
                    onClick={() => setShowModal(true)}
                  >
                    View all ({repos.length})
                  </button>
                </div>
                <div className="recent-repos-list">
                  {repos.slice(0, 5).map((repo) => (
                    <div
                      key={repo.id || repo.fullName}
                      className="recent-repo-item"
                      onClick={() => handleSelectRepo(repo)}
                    >
                      <span className="repo-item-name">{repo.fullName}</span>
                      <span className="repo-item-path">{repo.owner}/{repo.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="repo-empty">
                <p>No repositories found.</p>
              </div>
            )}
          </div>
        )}

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
    </div>
  )
}
