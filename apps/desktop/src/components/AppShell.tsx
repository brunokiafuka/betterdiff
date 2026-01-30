import React, { useState, useEffect, useCallback } from 'react'
import { Settings } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useUiStore } from '../stores/uiStore'
import { RepoSearchModal } from './RepoSearchModal'
import { BranchSelector } from './BranchSelector'
import { GlobalFeedback } from './GlobalFeedback'
import './AppShell.css'

interface AppShellProps {
  children: React.ReactNode
  onSettingsClick?: () => void
}

export const AppShell: React.FC<AppShellProps> = ({ children, onSettingsClick }) => {
  const { currentRepo, setRepo, setRefs } = useAppStore()
  const [showModal, setShowModal] = useState(false)
  const [repos, setRepos] = useState<any[]>([])
  const [recentRepos, setRecentRepos] = useState<any[]>([])
  const [openingLocalRepo, setOpeningLocalRepo] = useState(false)
  const { startAction, finishAction, failAction, addToast } = useUiStore()

  const normalizeRepoPath = useCallback((value?: string | null) => {
    if (!value) return ''
    const trimmed = value.trim().replace(/[\\\/]+$/, '')
    if (!trimmed) return ''
    return navigator.userAgent.toLowerCase().includes('windows')
      ? trimmed.toLowerCase()
      : trimmed
  }, [])

  // Keyboard shortcut: Cmd+A to open AI panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        if (currentRepo) {
          window.dispatchEvent(new CustomEvent('open-ai-panel'))
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentRepo])

  const applyLocalRepo = useCallback(
    async (repo: any) => {
      if (!repo.type) {
        repo.type = 'local'
      }

      setRepo(repo)

      try {
        const config = (await window.electronAPI.config.read()) || {}
        const recent = config.recentRepos || []
        const filtered = recent.filter((r: any) =>
          r.type === 'local'
            ? r.localPath !== repo.localPath
            : r.fullName !== repo.fullName
        )
        const updated = [{ ...repo, lastAccessed: new Date().toISOString() }, ...filtered].slice(0, 10)
        await window.electronAPI.config.write({ ...config, recentRepos: updated })
        setRecentRepos(updated.filter((r: any) => r.type !== 'local' && !r.localPath).slice(0, 5))
      } catch (err) {
        console.error('Failed to update recent repos:', err)
      }

      const branches = await window.electronAPI.local.listBranches(repo.localPath!)
      if (branches.length > 0) {
        const currentBranch = branches.find((b: any) => b.isCurrent) ||
          branches.find((b: any) => b.name === repo.defaultBranch) ||
          branches[0]
        setRefs(currentBranch, currentBranch)
      }
    },
    [setRepo, setRefs]
  )

  const openLocalRepoFromPath = useCallback(
    async (repoPath: string) => {
      if (!repoPath || openingLocalRepo) {
        console.log('[AppShell] openLocalRepoFromPath skipped', { repoPath, openingLocalRepo })
        return
      }
      const normalizedTarget = normalizeRepoPath(repoPath)
      const normalizedCurrent = normalizeRepoPath(currentRepo?.localPath || '')
      if (normalizedTarget && normalizedTarget === normalizedCurrent) {
        addToast('info', 'This worktree is already open')
        return
      }
      console.log('[AppShell] openLocalRepoFromPath start', { repoPath })
      setOpeningLocalRepo(true)
      startAction('openLocalRepo', 'Opening local repository...')
      try {
        const repo = await window.electronAPI.local.getRepoInfo(repoPath)
        if (!repo) {
          console.warn('[AppShell] getRepoInfo returned empty', { repoPath })
          finishAction('openLocalRepo')
          return
        }
        await applyLocalRepo(repo)
        addToast('success', `Opened ${repo.fullName}`)
        console.log('[AppShell] openLocalRepoFromPath success', { repoPath })
      } catch (err) {
        console.error('[AppShell] Failed to open local repo', err)
        failAction('openLocalRepo', 'Failed to open local repository')
        addToast('error', 'Failed to open local repository')
      } finally {
        setOpeningLocalRepo(false)
        finishAction('openLocalRepo')
      }
    },
    [openingLocalRepo, startAction, finishAction, failAction, addToast, applyLocalRepo]
  )

  const handleSelectLocalRepo = useCallback(async () => {
    if (openingLocalRepo) {
      return
    }
    setOpeningLocalRepo(true)
    startAction('openLocalRepo', 'Opening local repository...')
    try {
      const repo = await window.electronAPI.local.selectFolder()
      if (!repo) {
        finishAction('openLocalRepo')
        return
      }
      await applyLocalRepo(repo)
    } catch (err) {
      console.error('Failed to select local repo:', err)
      failAction('openLocalRepo', 'Failed to open local repository')
      addToast('error', 'Failed to open local repository')
    } finally {
      setOpeningLocalRepo(false)
      finishAction('openLocalRepo')
    }
  }, [openingLocalRepo, startAction, finishAction, failAction, addToast, applyLocalRepo])

  // Listen for menu events to open repo modal or local picker
  useEffect(() => {
    const handleMenuOpenRemote = () => {
      setShowModal(true)
    }

    window.addEventListener('menu:open-remote-repo', handleMenuOpenRemote)
    window.addEventListener('menu:open-local-repo', handleSelectLocalRepo)
    return () => {
      window.removeEventListener('menu:open-remote-repo', handleMenuOpenRemote)
      window.removeEventListener('menu:open-local-repo', handleSelectLocalRepo)
    }
  }, [handleSelectLocalRepo])

  useEffect(() => {
    const handleOpenLocalRepoPath = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      if (detail) {
        void openLocalRepoFromPath(detail)
      }
    }
    window.addEventListener('app:open-local-repo-path', handleOpenLocalRepoPath as EventListener)
    const dispose =
      window.electronAPI.app?.onAppAction?.('open-local-repo-path', (repoPath: string) => {
        if (repoPath) {
          void openLocalRepoFromPath(repoPath)
        }
      }) || null
    return () => {
      window.removeEventListener('app:open-local-repo-path', handleOpenLocalRepoPath as EventListener)
      if (dispose) dispose()
    }
  }, [openLocalRepoFromPath])

  useEffect(() => {
    const loadRepos = async () => {
      try {
        const repoList = await window.electronAPI.github.fetchRepos()
        // Only keep remote (GitHub) repos
        setRepos(repoList.filter((r: any) => r.type !== 'local' && !r.localPath))
      } catch (err) {
        console.error('Failed to load repos:', err)
      }
    }

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
        // Only keep remote repos for the modal
        setRecentRepos(recent.filter((r: any) => r.type !== 'local' && !r.localPath).slice(0, 5))
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
      // Ensure repo has type - detect local repos by checking for localPath
      if (!repo.type) {
        repo.type = repo.localPath ? 'local' : 'github'
      }

      setRepo(repo)

      // Update recent repos in config
      try {
        const config = await window.electronAPI.config.read() || {}
        const recent = config.recentRepos || []
        const filtered = recent.filter((r: any) =>
          r.type === 'local'
            ? r.localPath !== repo.localPath
            : r.fullName !== repo.fullName
        )
        const updated = [{ ...repo, lastAccessed: new Date().toISOString() }, ...filtered].slice(0, 10)
        await window.electronAPI.config.write({ ...config, recentRepos: updated })
        setRecentRepos(updated.slice(0, 5))
      } catch (err) {
        console.error('Failed to update recent repos:', err)
      }

      // Fetch branches and set default ref
      if (repo.type === 'local' && repo.localPath) {
        // For local repos, get the current branch (what's actually checked out)
        const branches = await window.electronAPI.local.listBranches(repo.localPath)
        if (branches.length > 0) {
          // Find the current branch or use the default branch from repo info
          const currentBranch = branches.find((b: any) => b.name === repo.defaultBranch) || branches[0]
          setRefs(currentBranch, currentBranch)
        }
      } else {
        // For GitHub repos, default to main/master or the repo's default branch
        const branches = await window.electronAPI.github.listBranches(repo.fullName)
        if (branches.length > 0) {
          // Try to find main, then master, then defaultBranch, then first branch
          const defaultBranch = branches.find((b: any) => b.name === 'main') ||
            branches.find((b: any) => b.name === 'master') ||
            branches.find((b: any) => b.name === repo.defaultBranch) ||
            branches[0]
          setRefs(defaultBranch, defaultBranch)
        }
      }
    } catch (err: any) {
      console.error('Failed to select repo:', err)
    }
  }

  return (
    <>
      <div className="app-shell">
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="repo-selector">
            {currentRepo ? (
              <>
                <button
                  className="repo-name-btn"

                  title="Click to change repository"
                >
                  {currentRepo.fullName}
                </button>
                <BranchSelector />
              </>
            ) : null}
          </div>
        </div>

        <div className="top-bar-right">
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

      <GlobalFeedback />
    </>
  )
}
