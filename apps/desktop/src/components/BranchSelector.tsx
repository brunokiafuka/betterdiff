import { useState, useEffect, useRef } from 'react'
import { GitBranch, ChevronDown, X, AlertCircle, Save, Trash2 } from 'lucide-react'
import { BranchSelector as UiBranchSelector } from '@whodidit/ui'
import { useAppStore } from '../stores/appStore'

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

  const branchItems = branches.map((branch) => ({
    name: branch.name,
    isCurrent: branch.name === currentBranch.name || (branch as any).isCurrent,
  }))

  return (
    <div ref={dropdownRef}>
      <UiBranchSelector
        triggerLabel={currentBranch.name}
        triggerDisabled={loading}
        isOpen={isOpen}
        loading={loading}
        branches={branchItems}
        error={error}
        onToggleOpen={() => setIsOpen(!isOpen)}
        onClose={() => setIsOpen(false)}
        onSelectBranch={(branch) =>
          handleBranchSelect(branches.find((b) => b.name === branch.name))
        }
        onDismissError={() => setError(null)}
        conflict={
          hasLocalChanges && pendingBranch
            ? {
              branchName: pendingBranch.name,
              onStash: handleStashAndCheckout,
              onDiscard: handleDiscardAndCheckout,
              onCancel: () => {
                setPendingBranch(null)
                setHasLocalChanges(false)
                setError(null)
              },
              loading,
              warningIcon: <AlertCircle size={16} />,
              stashIcon: <Save size={14} />,
              discardIcon: <Trash2 size={14} />,
            }
            : undefined
        }
        triggerIcon={<GitBranch size={16} />}
        chevronIcon={<ChevronDown size={14} className={`chevron ${isOpen ? 'open' : ''}`} />}
        closeIcon={<X size={14} />}
        branchIcon={<GitBranch size={14} />}
      />
    </div>
  )
}
