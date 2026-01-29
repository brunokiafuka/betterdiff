import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { RepoSearchModal } from './RepoSearchModal'
import { Settings, FolderOpen, HardDrive, Globe } from 'lucide-react'
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
      const recent = (config?.recentRepos || []).map((r: any) => {
        // Ensure type is set for backward compatibility
        if (!r.type) {
          r.type = r.localPath ? 'local' : 'github'
        }
        return r
      })
      // Only show remote repos in recent list for the modal
      setRecentRepos(recent.filter((r: any) => r.type !== 'local' && !r.localPath).slice(0, 5))
    } catch (err) {
      console.error('Failed to load recent repos:', err)
    }
  }

  const loadRepos = async () => {
    setLoading(true)
    setError(null)
    try {
      const repoList = await window.electronAPI.github.fetchRepos()
      // Only keep remote (GitHub) repos for the modal
      setRepos(repoList.filter((r: any) => r.type !== 'local' && !r.localPath))
    } catch (err: any) {
      setError(err.message || 'Failed to load repositories')
      console.error('Failed to load repos:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectLocalRepo = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const repo = await window.electronAPI.local.selectFolder()
      if (!repo) {
        setLoading(false)
        return
      }

      // Ensure repo has type
      if (!repo.type) {
        repo.type = 'local'
      }

      setRepo(repo)

      // Update recent repos in config
      try {
        const config = await window.electronAPI.config.read() || {}
        const recent = config.recentRepos || []
        // Remove if already exists (check by id or localPath for local repos)
        const filtered = recent.filter((r: any) =>
          r.type === 'local'
            ? r.localPath !== repo.localPath
            : r.fullName !== repo.fullName
        )
        // Add to front
        const updated = [{ ...repo, lastAccessed: new Date().toISOString() }, ...filtered].slice(0, 10)
        await window.electronAPI.config.write({ ...config, recentRepos: updated })
        setRecentRepos(updated.slice(0, 5))
      } catch (err) {
        console.error('Failed to update recent repos:', err)
      }

      // Fetch branches and set current branch (what's actually checked out)
      const branches = await window.electronAPI.local.listBranches(repo.localPath!)
      if (branches.length > 0) {
        // Find the current branch (first one is usually current) or use defaultBranch
        const currentBranch = branches.find((b: any) => b.isCurrent) ||
          branches.find((b: any) => b.name === repo.defaultBranch) ||
          branches[0]
        setRefs(currentBranch, currentBranch)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to select local repository')
      console.error('Failed to select local repo:', err)
    } finally {
      setLoading(false)
    }
  }, [setRepo, setRefs])

  // Listen for menu events (after handleSelectLocalRepo is defined)
  useEffect(() => {
    const handleMenuOpenRemote = () => {
      if (configExists && repos.length > 0) {
        setShowModal(true)
      }
    }

    window.addEventListener('menu:open-remote-repo', handleMenuOpenRemote)
    window.addEventListener('menu:open-local-repo', handleSelectLocalRepo)

    return () => {
      window.removeEventListener('menu:open-remote-repo', handleMenuOpenRemote)
      window.removeEventListener('menu:open-local-repo', handleSelectLocalRepo)
    }
  }, [configExists, repos.length, handleSelectLocalRepo])

  const handleSelectRepo = async (repo: any) => {
    setShowModal(false) // Close modal when repo is selected
    setLoading(true)
    setError(null)
    try {
      // Ensure repo has type - detect local repos by checking for localPath
      if (!repo.type) {
        repo.type = repo.localPath ? 'local' : 'github'
      }

      setRepo(repo)

      // Update recent repos in config
      try {
        const config = await window.electronAPI.config.read() || {}
        const recent = config.recentRepos || []
        // Remove if already exists
        const filtered = recent.filter((r: any) =>
          r.type === 'local'
            ? r.localPath !== repo.localPath
            : r.fullName !== repo.fullName
        )
        // Add to front
        const updated = [{ ...repo, lastAccessed: new Date().toISOString() }, ...filtered].slice(0, 10)
        await window.electronAPI.config.write({ ...config, recentRepos: updated })
        setRecentRepos(updated.slice(0, 5))
      } catch (err) {
        console.error('Failed to update recent repos:', err)
      }

      // Fetch branches and set default ref
      if (repo.type === 'local' && repo.localPath) {
        try {
          const branches = await window.electronAPI.local.listBranches(repo.localPath)
          if (branches.length > 0) {
            const defaultBranch = branches.find((b: any) => b.name === repo.defaultBranch) || branches[0]
            setRefs(defaultBranch, defaultBranch)
          } else {
            console.warn('No branches found for local repo:', repo.localPath)
            setError('No branches found in repository')
          }
        } catch (branchError: any) {
          console.error('Failed to fetch branches for local repo:', branchError)
          setError(`Failed to load branches: ${branchError.message}`)
        }
      } else {
        const branches = await window.electronAPI.github.listBranches(repo.fullName)
        if (branches.length > 0) {
          const defaultBranch = branches.find((b: any) => b.name === repo.defaultBranch) || branches[0]
          setRefs(defaultBranch, defaultBranch)
        }
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
                <span>Open GitHub Repository</span>
              </button>
              <button
                className="welcome-action-btn"
                onClick={handleSelectLocalRepo}
                disabled={loading}
              >
                <HardDrive size={16} />
                <span>Open Local Repository</span>
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
                      {repo.type === 'local' ? (
                        <HardDrive size={18} className="repo-item-icon" />
                      ) : (
                        <Globe size={18} className="repo-item-icon" />
                      )}
                      <div className="repo-item-content">
                        <span className="repo-item-name">{repo.fullName}</span>
                        <span className="repo-item-path">{repo.owner}/{repo.name}</span>
                      </div>
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
                      <Globe size={18} className="repo-item-icon" />
                      <div className="repo-item-content">
                        <span className="repo-item-name">{repo.fullName}</span>
                        <span className="repo-item-path">{repo.owner}/{repo.name}</span>
                      </div>
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
                const recent = (config.recentRepos || []).filter((r: any) =>
                  r.type === 'local'
                    ? r.localPath !== repo.localPath
                    : r.fullName !== repo.fullName
                )
                await window.electronAPI.config.write({ ...config, recentRepos: recent })
                setRecentRepos(recent.filter((r: any) => r.type !== 'local' && !r.localPath).slice(0, 5))
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
