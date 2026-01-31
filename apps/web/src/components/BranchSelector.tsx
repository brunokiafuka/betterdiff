import { useState, useEffect, useRef } from 'react'
import { useSignals } from '@preact/signals-react/runtime'
import { GitBranch, ChevronDown, X } from 'lucide-react'
import { BranchSelector as UiBranchSelector } from '@whodidit/ui'
import { currentRepo, baseRef, setRefs } from '../stores/appStore'
import { useListBranches } from '../services/github'

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

  const branchItems = branches.map((branch: any) => ({
    name: branch.name,
    isCurrent: branch.name === currentBranch?.name,
  }))

  return (
    <div ref={dropdownRef}>
      <UiBranchSelector
        triggerLabel={loading ? 'Loading...' : currentBranch?.name || 'Select branch'}
        triggerDisabled={loading || !currentBranch}
        isOpen={isOpen}
        loading={loading}
        branches={branchItems}
        error={error}
        onToggleOpen={() => setIsOpen(!isOpen)}
        onClose={() => setIsOpen(false)}
        onSelectBranch={(branch) =>
          handleBranchSelect(branches.find((b: any) => b.name === branch.name))
        }
        onDismissError={() => setError(null)}
        triggerIcon={<GitBranch size={16} />}
        chevronIcon={<ChevronDown size={14} className={`chevron ${isOpen ? 'open' : ''}`} />}
        closeIcon={<X size={14} />}
        branchIcon={<GitBranch size={14} />}
      />
    </div>
  )
}
