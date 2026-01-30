import { useEffect, useState } from 'react'
import { GitBranch, RefreshCw, Plus, X } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useUiStore } from '../stores/uiStore'
import { worktreeService } from '../services/worktrees'
import { WorktreeAddOptions, WorktreeInfo } from '../types'
import './WorktreesPanel.css'

interface WorktreesPanelProps {
  onClose?: () => void
}

export const WorktreesPanel: React.FC<WorktreesPanelProps> = ({ onClose }) => {
  const { currentRepo } = useAppStore()
  const { addToast, startAction, finishAction, failAction } = useUiStore()
  const [worktrees, setWorktrees] = useState<WorktreeInfo[]>([])
  const [worktreesLoading, setWorktreesLoading] = useState(false)
  const [worktreesError, setWorktreesError] = useState<string | null>(null)
  const [showWorktreeModal, setShowWorktreeModal] = useState(false)
  const [localBranches, setLocalBranches] = useState<{ name: string }[]>([])
  const [branchSelection, setBranchSelection] = useState('custom')
  const [worktreeForm, setWorktreeForm] = useState<WorktreeAddOptions>({
    path: '',
    branch: '',
    commit: '',
    useExistingBranch: false,
    resetBranch: false,
    detach: false,
    checkout: true,
    lock: false,
    lockReason: '',
    orphan: false,
    force: false,
    track: false,
    guessRemote: false
  })

  const canManageWorktrees = currentRepo?.type === 'local' && !!currentRepo.localPath
  const normalizeBranchName = (value?: string) => {
    if (!value) return ''
    const trimmed = value.trim()
    if (!trimmed) return ''
    return trimmed.startsWith('refs/heads/') ? trimmed.slice('refs/heads/'.length) : trimmed
  }

  const loadWorktrees = async () => {
    if (!canManageWorktrees) return
    setWorktreesLoading(true)
    setWorktreesError(null)
    startAction('loadWorktrees', 'Loading worktrees...')
    try {
      const list = await worktreeService.list(currentRepo.localPath!)
      setWorktrees(list)
    } catch (err: any) {
      const message = err.message || 'Failed to load worktrees'
      setWorktreesError(message)
      addToast('error', message)
      failAction('loadWorktrees', message)
    } finally {
      setWorktreesLoading(false)
      finishAction('loadWorktrees')
    }
  }

  useEffect(() => {
    loadWorktrees()
  }, [currentRepo])

  const resetWorktreeForm = () => {
    setBranchSelection('custom')
    setWorktreeForm({
      path: '',
      branch: '',
      commit: '',
      useExistingBranch: false,
      resetBranch: false,
      detach: false,
      checkout: true,
      lock: false,
      lockReason: '',
      orphan: false,
      force: false,
      track: false,
      guessRemote: false
    })
  }

  const handleCreateWorktree = async () => {
    if (!canManageWorktrees) return
    if (!worktreeForm.path?.trim()) {
      addToast('error', 'Worktree path is required')
      return
    }

    const targetBranch = normalizeBranchName(worktreeForm.branch)
    if (targetBranch && !worktreeForm.force) {
      const inUse = worktrees.find(
        (worktree) => normalizeBranchName(worktree.branch) === targetBranch
      )
      if (inUse) {
        addToast(
          'error',
          `Branch "${targetBranch}" is already checked out at ${inUse.path}. Choose another branch or enable Force.`
        )
        return
      }
    }

    const normalizedPath = worktreeForm.path.trim().replace(/[\\\/]+$/, '')
    const existingPath = worktrees.find((worktree) =>
      worktree.path.toLowerCase() === normalizedPath.toLowerCase()
    )
    const pruneAndReload = async () => {
      if (!canManageWorktrees) return
      startAction('pruneWorktrees', 'Pruning worktrees...')
      try {
        await worktreeService.prune(currentRepo.localPath!)
      } catch (err: any) {
        addToast('error', err.message || 'Failed to prune worktrees')
        failAction('pruneWorktrees', err.message || 'Failed to prune worktrees')
      } finally {
        finishAction('pruneWorktrees')
        await loadWorktrees()
      }
    }

    const removeExistingAndRetry = async () => {
      const existing = worktrees.find(
        (worktree) => worktree.path.toLowerCase() === normalizedPath.toLowerCase()
      )
      if (!existing) {
        await pruneAndReload()
        addToast('error', 'Path exists but is not a registered worktree. Choose another path.')
        return
      }
      const confirmRemove = window.confirm(
        'Worktree path already exists. Remove it and try again?'
      )
      if (!confirmRemove) return
      startAction('removeWorktree', 'Removing worktree...')
      try {
        await worktreeService.remove(currentRepo.localPath!, normalizedPath, true)
        addToast('success', 'Existing worktree removed')
      } catch (err: any) {
        const message = err.message || 'Failed to remove existing worktree'
        if (message.includes('not a working tree')) {
          await pruneAndReload()
          addToast('error', 'Path is not a registered worktree. Choose another path.')
        } else {
          addToast('error', message)
        }
        failAction('removeWorktree', message)
        return
      } finally {
        finishAction('removeWorktree')
      }
    }

    if (existingPath) {
      await removeExistingAndRetry()
    }

    const options: WorktreeAddOptions = {
      ...worktreeForm,
      path: normalizedPath,
      branch: worktreeForm.branch?.trim() || undefined,
      commit: worktreeForm.commit?.trim() || undefined,
      lockReason: worktreeForm.lockReason?.trim() || undefined
    }

    startAction('createWorktree', 'Creating worktree...')
    try {
      const pathExists = await window.electronAPI.local.pathExists(normalizedPath)
      if (pathExists) {
        const confirmDelete = window.confirm(
          'Folder already exists on disk. Remove it and continue?'
        )
        if (!confirmDelete) {
          finishAction('createWorktree')
          return
        }
        await window.electronAPI.local.removeFolder(normalizedPath)
      }
      await worktreeService.add(currentRepo.localPath!, options)
      addToast('success', 'Worktree created')
      setShowWorktreeModal(false)
      resetWorktreeForm()
      await loadWorktrees()
    } catch (err: any) {
      const message = err.message || 'Failed to create worktree'
      if (message.includes('PATH_EXISTS')) {
        await pruneAndReload()
        await removeExistingAndRetry()
      } else {
        addToast('error', message)
      }
      failAction('createWorktree', message)
    } finally {
      finishAction('createWorktree')
    }
  }

  const loadLocalBranches = async () => {
    if (!canManageWorktrees) return
    try {
      const branches = await window.electronAPI.local.listBranches(currentRepo.localPath!)
      setLocalBranches(branches)
    } catch (err: any) {
      console.error('Failed to load branches:', err)
    }
  }

  const handleRemoveWorktree = async (worktreePath: string) => {
    if (!canManageWorktrees) return
    startAction('removeWorktree', 'Removing worktree...')
    try {
      await worktreeService.remove(currentRepo.localPath!, worktreePath)
      addToast('success', 'Worktree removed')
      await loadWorktrees()
    } catch (err: any) {
      const message = err.message || ''
      if (message.includes('DIRTY_WORKTREE')) {
        const confirmForce = window.confirm(
          'Worktree has uncommitted changes. Force remove?'
        )
        if (confirmForce) {
          await worktreeService.remove(currentRepo.localPath!, worktreePath, true)
          addToast('success', 'Worktree removed (forced)')
          await loadWorktrees()
        }
      } else {
        addToast('error', message || 'Failed to remove worktree')
      }
      failAction('removeWorktree', message || 'Failed to remove worktree')
    } finally {
      finishAction('removeWorktree')
    }
  }

  const handleToggleLock = async (worktree: WorktreeInfo) => {
    if (!canManageWorktrees) return
    startAction('toggleWorktreeLock', 'Updating worktree lock...')
    try {
      if (worktree.locked) {
        await worktreeService.unlock(currentRepo.localPath!, worktree.path)
        addToast('success', 'Worktree unlocked')
      } else {
        const reason = window.prompt('Lock reason (optional):', '') || undefined
        await worktreeService.lock(currentRepo.localPath!, worktree.path, reason)
        addToast('success', 'Worktree locked')
      }
      await loadWorktrees()
    } catch (err: any) {
      const message = err.message || 'Failed to update worktree lock'
      addToast('error', message)
      failAction('toggleWorktreeLock', message)
    } finally {
      finishAction('toggleWorktreeLock')
    }
  }

  return (
    <div className="worktrees-panel">
      <div className="worktrees-header">
        <div className="worktrees-title">
          <GitBranch size={16} />
          <h3>Worktrees</h3>
        </div>
        <div className="worktrees-header-actions">
          <button
            className="worktree-icon-btn"
            onClick={loadWorktrees}
            disabled={!canManageWorktrees || worktreesLoading}
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            className="worktree-icon-btn"
            onClick={() => setShowWorktreeModal(true)}
            disabled={!canManageWorktrees}
            title="Create Worktree"
          >
            <Plus size={14} />
          </button>
          {onClose && (
            <button className="worktree-icon-btn" onClick={onClose} title="Close">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {!canManageWorktrees && (
        <div className="worktrees-hint">
          Select a local repository to manage worktrees.
        </div>
      )}

      {worktreesError && (
        <div className="worktrees-error">
          <strong>Error:</strong> {worktreesError}
        </div>
      )}

      {worktreesLoading ? (
        <div className="worktrees-loading">
          <div className="spinner"></div>
          <p>Loading worktrees...</p>
        </div>
      ) : (
        <div className="worktrees-list">
          {worktrees.map((worktree) => (
            <div key={worktree.path} className="worktree-row">
              <div className="worktree-main">
                <div className="worktree-path">{worktree.path}</div>
                <div className="worktree-meta">
                  {worktree.branch ? worktree.branch : worktree.detached ? 'detached' : 'unknown'}
                  {worktree.isMain ? ' · main' : ''}
                  {worktree.locked ? ' · locked' : ''}
                  {worktree.prunable ? ' · prunable' : ''}
                </div>
              </div>
              <div className="worktree-actions">
                <button
                  className="worktree-btn"
                  onClick={() => handleToggleLock(worktree)}
                >
                  {worktree.locked ? 'Unlock' : 'Lock'}
                </button>
                {!worktree.isMain && (
                  <button
                    className="worktree-btn"
                    onClick={() => handleRemoveWorktree(worktree.path)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}

          {worktrees.length === 0 && canManageWorktrees && (
            <div className="worktrees-empty">No worktrees found.</div>
          )}
        </div>
      )}

      {showWorktreeModal && (
        <div className="worktree-modal-backdrop">
          <div className="worktree-modal">
            <div className="worktree-modal-header">
              <h3>Create Worktree</h3>
              <button
                className="worktree-icon-btn"
                onClick={() => setShowWorktreeModal(false)}
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
            <div className="worktree-modal-body">
              <div className="worktree-form-group">
                <label>Path</label>
                <div className="worktree-path-row">
                  <input
                    type="text"
                    value={worktreeForm.path}
                    onChange={(e) => setWorktreeForm({ ...worktreeForm, path: e.target.value })}
                    placeholder="C:\\path\\to\\worktree"
                    className="worktree-input"
                  />
                  <button
                    type="button"
                    className="worktree-btn"
                    onClick={async () => {
                      try {
                        if (!window.electronAPI?.local?.selectFolderPath) {
                          addToast('error', 'Folder picker is not available')
                          return
                        }
                        const selectedPath = await window.electronAPI.local.selectFolderPath()
                        if (selectedPath) {
                          setWorktreeForm({ ...worktreeForm, path: selectedPath })
                        }
                      } catch (err: any) {
                        addToast('error', err.message || 'Failed to open folder picker')
                      }
                    }}
                  >
                    Browse
                  </button>
                </div>
              </div>
              <div className="worktree-form-group">
                <label>Branch (optional)</label>
                <div className="worktree-branch-row">
                  <select
                    className="worktree-input"
                    value={branchSelection}
                    onChange={(e) => {
                      const value = e.target.value
                      setBranchSelection(value)
                      if (value === 'custom') {
                        setWorktreeForm({ ...worktreeForm, branch: '', useExistingBranch: false })
                      } else {
                        setWorktreeForm({ ...worktreeForm, branch: value, useExistingBranch: true })
                      }
                    }}
                    onFocus={loadLocalBranches}
                  >
                    <option value="custom">Custom branch...</option>
                    {localBranches.map((branch) => (
                      <option key={branch.name} value={branch.name}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  {branchSelection === 'custom' && (
                    <input
                      type="text"
                      value={worktreeForm.branch || ''}
                      onChange={(e) =>
                        setWorktreeForm({
                          ...worktreeForm,
                          branch: e.target.value,
                          useExistingBranch: false
                        })
                      }
                      placeholder="feature/my-branch"
                      className="worktree-input"
                    />
                  )}
                </div>
              </div>
              <div className="worktree-form-group">
                <label>Commit (optional)</label>
                <input
                  type="text"
                  value={worktreeForm.commit || ''}
                  onChange={(e) => setWorktreeForm({ ...worktreeForm, commit: e.target.value })}
                  placeholder="HEAD or SHA"
                  className="worktree-input"
                />
              </div>
              <div className="worktree-toggle-row">
                <label>
                  <input
                    type="checkbox"
                    checked={!!worktreeForm.detach}
                    onChange={(e) => setWorktreeForm({ ...worktreeForm, detach: e.target.checked })}
                  />
                  Detach
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={!!worktreeForm.orphan}
                    onChange={(e) => setWorktreeForm({ ...worktreeForm, orphan: e.target.checked })}
                  />
                  Orphan
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={!!worktreeForm.track}
                    onChange={(e) => setWorktreeForm({ ...worktreeForm, track: e.target.checked })}
                  />
                  Track
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={!!worktreeForm.guessRemote}
                    onChange={(e) => setWorktreeForm({ ...worktreeForm, guessRemote: e.target.checked })}
                  />
                  Guess Remote
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={!!worktreeForm.resetBranch}
                    onChange={(e) => setWorktreeForm({ ...worktreeForm, resetBranch: e.target.checked })}
                  />
                  Reset Branch (-B)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={worktreeForm.checkout === false}
                    onChange={(e) => setWorktreeForm({ ...worktreeForm, checkout: !e.target.checked })}
                  />
                  No Checkout
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={!!worktreeForm.force}
                    onChange={(e) => setWorktreeForm({ ...worktreeForm, force: e.target.checked })}
                  />
                  Force
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={!!worktreeForm.lock}
                    onChange={(e) => setWorktreeForm({ ...worktreeForm, lock: e.target.checked })}
                  />
                  Lock
                </label>
              </div>
              {worktreeForm.lock && (
                <div className="worktree-form-group">
                  <label>Lock Reason (optional)</label>
                  <input
                    type="text"
                    value={worktreeForm.lockReason || ''}
                    onChange={(e) => setWorktreeForm({ ...worktreeForm, lockReason: e.target.value })}
                    placeholder="Reason for lock"
                    className="worktree-input"
                  />
                </div>
              )}
            </div>
            <div className="worktree-modal-actions">
              <button
                className="worktree-btn"
                onClick={() => setShowWorktreeModal(false)}
              >
                Cancel
              </button>
              <button className="worktree-btn primary" onClick={handleCreateWorktree}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
