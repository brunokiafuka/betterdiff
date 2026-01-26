import { useState, useEffect, useRef } from 'react'
import { GitBranch, ChevronDown, X, AlertCircle, Save, Trash2 } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import './BranchSelector.css'

export const BranchSelector: React.FC = () => {
  const { currentRepo, baseRef, setRefs } = useAppStore()
  const [branches, setBranches] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingBranch, setPendingBranch] = useState<any>(null)
  const [hasLocalChanges, setHasLocalChanges] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!currentRepo) {
      setBranches([])
      return
    }

    const loadBranches = async () => {
      setLoading(true)
      setError(null)
      try {
        const branchList = currentRepo.type === 'local' && currentRepo.localPath
          ? await window.electronAPI.local.listBranches(currentRepo.localPath)
          : await window.electronAPI.github.listBranches(currentRepo.fullName)
        setBranches(branchList)
      } catch (err: any) {
        console.error('Failed to load branches:', err)
        setError(err.message || 'Failed to load branches')
      } finally {
        setLoading(false)
      }
    }

    loadBranches()
  }, [currentRepo])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleBranchSelect = async (branch: any, force: boolean = false) => {
    if (!currentRepo || !branch) return

    setLoading(true)
    setError(null)

    try {
      if (currentRepo.type === 'local' && currentRepo.localPath) {
        // For local repos, actually checkout the branch
        const checkedOutBranch = await window.electronAPI.local.checkoutBranch(
          currentRepo.localPath,
          branch.name,
          force
        )
        setRefs(checkedOutBranch, checkedOutBranch)
        // Reload branches to update current branch indicator
        const branchList = await window.electronAPI.local.listBranches(currentRepo.localPath)
        setBranches(branchList)
        setPendingBranch(null)
        setHasLocalChanges(false)
        setIsOpen(false)
      } else {
        // For GitHub repos, just change the ref (no checkout needed)
        setRefs(branch, branch)
        setIsOpen(false)
      }
    } catch (err: any) {
      console.error('Failed to switch branch:', err)
      const errorMessage = err.message || 'Failed to switch branch'
      
      // Check if it's a local changes error
      if (errorMessage.includes('LOCAL_CHANGES')) {
        setPendingBranch(branch)
        setHasLocalChanges(true)
        // Check git status to show what files would be affected
        try {
          const status = await window.electronAPI.local.getStatus(currentRepo.localPath)
          setHasLocalChanges(status.hasChanges)
        } catch (statusErr) {
          // Ignore status check errors
        }
      } else {
        setError(errorMessage)
        setPendingBranch(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStashAndCheckout = async () => {
    if (!currentRepo?.localPath || !pendingBranch) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Stash changes
      await window.electronAPI.local.stashChanges(currentRepo.localPath, `Stashed before switching to ${pendingBranch.name}`)
      // Now checkout
      await handleBranchSelect(pendingBranch, false)
    } catch (err: any) {
      console.error('Failed to stash and checkout:', err)
      setError(err.message || 'Failed to stash changes')
      setLoading(false)
    }
  }

  const handleDiscardAndCheckout = async () => {
    if (!currentRepo?.localPath || !pendingBranch) return
    
    if (!confirm('Are you sure you want to discard all local changes? This action cannot be undone.')) {
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // Force checkout (discards changes)
      await handleBranchSelect(pendingBranch, true)
    } catch (err: any) {
      console.error('Failed to discard and checkout:', err)
      setError(err.message || 'Failed to checkout branch')
      setLoading(false)
    }
  }

  if (!currentRepo || !baseRef) {
    return null
  }

  const currentBranch = branches.find(b => b.name === baseRef.name) || baseRef

  return (
    <div className="branch-selector" ref={dropdownRef}>
      <button
        className="branch-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        title="Switch branch"
      >
        <GitBranch size={16} />
        <span className="branch-name">{currentBranch.name}</span>
        <ChevronDown size={14} className={`chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="branch-dropdown">
          <div className="branch-dropdown-header">
            <span>Select branch</span>
            <button
              className="branch-dropdown-close"
              onClick={() => setIsOpen(false)}
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
          <div className="branch-dropdown-content">
            {hasLocalChanges && pendingBranch ? (
              <div className="branch-conflict-warning">
                <div className="conflict-header">
                  <AlertCircle size={16} />
                  <span>Uncommitted changes detected</span>
                </div>
                <p className="conflict-message">
                  You have uncommitted changes that would be overwritten by switching to <strong>{pendingBranch.name}</strong>.
                </p>
                <div className="conflict-actions">
                  <button
                    className="conflict-btn stash-btn"
                    onClick={handleStashAndCheckout}
                    disabled={loading}
                  >
                    <Save size={14} />
                    <span>Stash & Switch</span>
                  </button>
                  <button
                    className="conflict-btn discard-btn"
                    onClick={handleDiscardAndCheckout}
                    disabled={loading}
                  >
                    <Trash2 size={14} />
                    <span>Discard & Switch</span>
                  </button>
                  <button
                    className="conflict-btn cancel-btn"
                    onClick={() => {
                      setPendingBranch(null)
                      setHasLocalChanges(false)
                      setError(null)
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : loading ? (
              <div className="branch-loading">
                <div className="spinner"></div>
                <span>Loading branches...</span>
              </div>
            ) : error ? (
              <div className="branch-error">
                <span>{error}</span>
                <button
                  className="error-dismiss"
                  onClick={() => setError(null)}
                >
                  Dismiss
                </button>
              </div>
            ) : branches.length === 0 ? (
              <div className="branch-empty">
                <span>No branches found</span>
              </div>
            ) : (
              branches.map((branch) => {
                const isCurrent = branch.name === currentBranch.name || (branch as any).isCurrent
                return (
                  <button
                    key={branch.name}
                    className={`branch-item ${isCurrent ? 'current' : ''}`}
                    onClick={() => handleBranchSelect(branch)}
                    disabled={isCurrent || loading}
                  >
                    <GitBranch size={14} />
                    <span className="branch-item-name">{branch.name}</span>
                    {isCurrent && <span className="branch-item-badge">Current</span>}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
