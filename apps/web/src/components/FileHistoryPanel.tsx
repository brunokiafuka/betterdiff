import { useState, useEffect, useCallback } from 'react'
import { useSignals } from '@preact/signals-react/runtime'
import { FileHistoryPanel as UiFileHistoryPanel } from '@whodidit/ui'
import { currentRepo, baseRef } from '../stores/appStore'
import { useGetFileHistory } from '../services/github'
import { track } from '../services/analytics'

interface CommitInfo {
  sha: string
  shortSha: string
  author: {
    name: string
    email: string
    date: string
  }
  message: string
  prNumber?: number
}

interface FileHistoryPanelProps {
  filePath: string
  onCommitsSelected: (baseSha: string, headSha: string) => void
  initialBaseSha?: string
  initialHeadSha?: string
}

export const FileHistoryPanel: React.FC<FileHistoryPanelProps> = ({
  filePath,
  onCommitsSelected,
  initialBaseSha,
  initialHeadSha,
}) => {
  useSignals()
  const repo = currentRepo.value
  const ref = baseRef.value
  const getFileHistory = useGetFileHistory()
  const [commits, setCommits] = useState<CommitInfo[]>([])
  const [selectedCommits, setSelectedCommits] = useState<[string | null, string | null]>([
    initialBaseSha || null,
    initialHeadSha || null,
  ])
  const [loading, setLoading] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true) // Start collapsed

  // Memoize onCommitsSelected to prevent infinite loops
  const memoizedOnCommitsSelected = useCallback(onCommitsSelected, [])

  useEffect(() => {
    if (!repo || !ref || !filePath) return

    const loadFileHistory = async () => {
      setLoading(true)
      try {
        const history = await getFileHistory({
          repoFullName: repo.fullName,
          filePath,
          ref: ref.sha
        })

        const formattedCommits: CommitInfo[] = history.map((commit: any) => ({
          sha: commit.sha || commit.commit?.sha,
          shortSha: (commit.sha || commit.commit?.sha || '').substring(0, 7),
          author: commit.commit?.author || commit.author || {
            name: 'Unknown',
            email: '',
            date: new Date().toISOString()
          },
          message: commit.commit?.message || commit.message || '',
          prNumber: extractPRNumber(commit.commit?.message || commit.message || '')
        }))

        setCommits(formattedCommits)

        // Use initial commits if provided, otherwise default to latest commit
        if (initialBaseSha && initialHeadSha) {
          // Verify commits exist in history
          const baseExists = formattedCommits.some(c => c.sha === initialBaseSha)
          const headExists = formattedCommits.some(c => c.sha === initialHeadSha)

          if (baseExists && headExists) {
            setSelectedCommits([initialBaseSha, initialHeadSha])
            memoizedOnCommitsSelected(initialBaseSha, initialHeadSha)
          } else if (formattedCommits.length >= 1) {
            // Fallback to latest if initial commits not found
            const sha = formattedCommits[0].sha
            setSelectedCommits([sha, sha])
            memoizedOnCommitsSelected(sha, sha)
          }
        } else if (formattedCommits.length >= 1) {
          // Default to same commit (latest) - shows file content
          const sha = formattedCommits[0].sha // Latest commit
          setSelectedCommits([sha, sha])
          memoizedOnCommitsSelected(sha, sha)
        }
      } catch (error) {
        console.error('Failed to load file history:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFileHistory()
  }, [repo, ref, filePath, getFileHistory, memoizedOnCommitsSelected])

  const extractPRNumber = (message: string): number | undefined => {
    const match = message.match(/#(\d+)/)
    return match ? parseInt(match[1]) : undefined
  }

  const handleSelectBase = (sha: string) => {
    const newBase = sha
    const newHead = selectedCommits[1] || sha // Keep current head or use same commit
    setSelectedCommits([newBase, newHead])
    onCommitsSelected(newBase, newHead)
  }

  const handleSelectHead = (sha: string) => {
    const newBase = selectedCommits[0] || sha // Keep current base or use same commit
    const newHead = sha
    setSelectedCommits([newBase, newHead])
    onCommitsSelected(newBase, newHead)
  }

  return (
    <UiFileHistoryPanel
      commits={commits}
      selectedCommits={selectedCommits}
      loading={loading}
      isCollapsed={isCollapsed}
      onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
      onOpen={() => track('file_history_opened', { surface: 'web' })}
      onSelectBase={handleSelectBase}
      onSelectHead={handleSelectHead}
    />
  )
}
