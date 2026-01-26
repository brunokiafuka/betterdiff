import { useState, useEffect, useRef } from 'react'
import { useSignals } from '@preact/signals-react/runtime'
import { GitBranch, ChevronDown, X } from 'lucide-react'
import { currentRepo, baseRef, setRefs } from '../stores/appStore'
import { useListBranches } from '../services/github'
import './BranchSelector.css'

export const BranchSelector: React.FC = () => {
  useSignals()
  const repo = currentRepo.value
  const ref = baseRef.value
  const listBranches = useListBranches()
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load branches when repo changes
  useEffect(() => {
    if (!repo?.fullName) {
      setBranches([])
      return
    }

    const loadBranches = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await listBranches({ repoFullName: repo.fullName })
        setBranches(result || [])
      } catch (err: any) {
        console.error('Failed to load branches:', err)
        setError(err.message || 'Failed to load branches')
        setBranches([])
      } finally {
        setLoading(false)
      }
    }

    loadBranches()
  }, [repo?.fullName, listBranches])

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

  // Set default branch when branches load and no ref is set
  useEffect(() => {
    if (repo && branches.length > 0 && !ref) {
      const defaultBranch = branches.find((b: any) => b.name === 'main') ||
        branches.find((b: any) => b.name === 'master') ||
        branches.find((b: any) => b.name === repo.defaultBranch) ||
        branches[0]
      setRefs(defaultBranch, defaultBranch)
    }
  }, [repo, branches, ref])

  const handleBranchSelect = (branch: any) => {
    if (!repo || !branch) return

    try {
      // For GitHub repos, just change the ref (no checkout needed)
      setRefs(branch, branch)
      setIsOpen(false)
      setError(null)
    } catch (err: any) {
      console.error('Failed to switch branch:', err)
      setError(err.message || 'Failed to switch branch')
    }
  }

  if (!repo) {
    return null
  }

  // If we have branches but no ref yet, we're still loading
  if (!ref && branches.length === 0 && !loading) {
    return null
  }

  const currentBranch = ref ? (branches.find((b: any) => b.name === ref.name) || ref) : null

  return (
    <div className="branch-selector" ref={dropdownRef}>
      <button
        className="branch-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Switch branch"
        disabled={loading || !currentBranch}
      >
        <GitBranch size={16} />
        <span className="branch-name">
          {loading ? 'Loading...' : currentBranch?.name || 'Select branch'}
        </span>
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
            {loading ? (
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
              branches.map((branch: any) => {
                const isCurrent = branch.name === currentBranch.name
                return (
                  <button
                    key={branch.name}
                    className={`branch-item ${isCurrent ? 'current' : ''}`}
                    onClick={() => handleBranchSelect(branch)}
                    disabled={isCurrent}
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
