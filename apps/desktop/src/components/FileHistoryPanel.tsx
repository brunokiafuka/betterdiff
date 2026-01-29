import { useState, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import { useUiStore } from '../stores/uiStore'
import './FileHistoryPanel.css'

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
  const { startAction, finishAction, failAction, addToast } = useUiStore()
  const [commits, setCommits] = useState<CommitInfo[]>([])
  const [selectedCommits, setSelectedCommits] = useState<[string | null, string | null]>([null, null])
  const [loading, setLoading] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true) // Start collapsed

  useEffect(() => {
    if (!currentRepo || !baseRef || !filePath) return

    const loadFileHistory = async () => {
      setLoading(true)
      startAction('loadFileHistory', 'Loading commit history...')
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
        failAction('loadFileHistory', 'Failed to load commit history')
        addToast('error', 'Failed to load commit history')
      } finally {
        setLoading(false)
        finishAction('loadFileHistory')
      }
    }

    loadFileHistory()
  }, [currentRepo, baseRef, filePath, onCommitsSelected, startAction, finishAction, failAction, addToast])

  const extractPRNumber = (message: string): number | undefined => {
    const match = message.match(/#(\d+)/)
    return match ? parseInt(match[1]) : undefined
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
    return `${Math.floor(diffDays / 365)}y ago`
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

  if (loading) {
    return (
      <div className="file-history-panel">
        <div className="file-history-loading">
          <div className="spinner"></div>
          <span>Loading commit history...</span>
        </div>
      </div>
    )
  }

  const isSameCommit = selectedCommits[0] === selectedCommits[1]

  return (
    <div className={`file-history-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="file-history-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="header-left">
          <span className={`collapse-icon ${isCollapsed ? '' : 'expanded'}`}>▶</span>
          <h3>History</h3>
          <span className="file-history-count">{commits.length} commits</span>
        </div>
        <div className="header-right">
          {selectedCommits[0] && (
            <span className={`selected-commits-badge ${isSameCommit ? 'single' : 'diff'}`}>
              {isSameCommit
                ? `@ ${selectedCommits[0]?.substring(0, 7)}`
                : `${selectedCommits[0]?.substring(0, 7)} → ${selectedCommits[1]?.substring(0, 7)}`
              }
            </span>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <>

          {/* Two-column layout for commit selection */}
          <div className="file-history-columns">
            {/* Left column - Old commits list (scrollable) */}
            <div className="history-column old-commits">
              <div className="column-header">
                <span className="column-label">Old Commit</span>
              </div>
              <div className="commits-scroll">
                {commits.map((commit) => {
                  const isBase = selectedCommits[0] === commit.sha
                  return (
                    <div
                      key={commit.sha}
                      className={`commit-item compact ${isBase ? 'selected base' : ''}`}
                      onClick={() => handleSelectBase(commit.sha)}
                    >
                      <div className="commit-header">
                        <span className="commit-date">{formatDate(commit.author.date)}</span>
                        <span className="commit-sha">{commit.shortSha}</span>
                      </div>
                      <div className="commit-author">{commit.author.name}</div>
                      {isBase && <div className="commit-badge">BASE</div>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="column-divider"></div>

            {/* Right column - New commits list (scrollable) */}
            <div className="history-column new-commits">
              <div className="column-header">
                <span className="column-label">New Commit</span>
              </div>
              <div className="commits-scroll">
                {commits.map((commit) => {
                  const isHead = selectedCommits[1] === commit.sha
                  return (
                    <div
                      key={commit.sha}
                      className={`commit-item compact ${isHead ? 'selected head' : ''}`}
                      onClick={() => handleSelectHead(commit.sha)}
                    >
                      <div className="commit-header">
                        <span className="commit-date">{formatDate(commit.author.date)}</span>
                        <span className="commit-sha">{commit.shortSha}</span>
                      </div>
                      <div className="commit-author">{commit.author.name}</div>
                      {isHead && <div className="commit-badge">COMPARE</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
