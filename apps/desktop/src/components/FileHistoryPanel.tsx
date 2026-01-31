import { useState, useEffect } from 'react'
import { FileHistoryPanel as UiFileHistoryPanel } from '@whodidit/ui'
import { useAppStore } from '../stores/appStore'

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
}

export const FileHistoryPanel: React.FC<FileHistoryPanelProps> = ({ filePath, onCommitsSelected }) => {
  const { currentRepo, baseRef } = useAppStore()
  const [commits, setCommits] = useState<CommitInfo[]>([])
  const [selectedCommits, setSelectedCommits] = useState<[string | null, string | null]>([null, null])
  const [loading, setLoading] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true) // Start collapsed

  useEffect(() => {
    if (!currentRepo || !baseRef || !filePath) return

    const loadFileHistory = async () => {
      setLoading(true)
      try {
        const history = currentRepo.type === 'local'
          ? await window.electronAPI.local.getFileHistory(
            currentRepo.localPath!,
            filePath,
            baseRef.name
          )
          : await window.electronAPI.github.getFileHistory(
            currentRepo.fullName,
            filePath,
            baseRef.sha
          )

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

        // Default to same commit (latest) - shows file content
        if (formattedCommits.length >= 1) {
          const sha = formattedCommits[0].sha // Latest commit
          setSelectedCommits([sha, sha])
          onCommitsSelected(sha, sha)
        }
      } catch (error) {
        console.error('Failed to load file history:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFileHistory()
  }, [currentRepo, baseRef, filePath, onCommitsSelected])

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
      onSelectBase={handleSelectBase}
      onSelectHead={handleSelectHead}
    />
  )
}
