import { useState, useEffect } from 'react'
import { X, ExternalLink, User, Calendar, GitBranch, GitPullRequest } from 'lucide-react'
import './CommitDetailsPanel.css'

interface CommitDetailsPanelProps {
  repoFullName: string
  repo?: { type?: 'github' | 'local'; localPath?: string }
  baseSha: string | null
  headSha: string | null
  onClose: () => void
}

export const CommitDetailsPanel: React.FC<CommitDetailsPanelProps> = ({
  repoFullName,
  repo,
  baseSha,
  headSha,
  onClose
}) => {
  const [baseCommit, setBaseCommit] = useState<any>(null)
  const [headCommit, setHeadCommit] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Validate inputs - ensure we have repo and at least one valid SHA
    const validBaseSha = baseSha && typeof baseSha === 'string' && baseSha.trim().length > 0
    const validHeadSha = headSha && typeof headSha === 'string' && headSha.trim().length > 0

    if (!repoFullName || (!validBaseSha && !validHeadSha)) {
      setBaseCommit(null)
      setHeadCommit(null)
      return
    }

    const loadCommits = async () => {
      setLoading(true)
      setBaseCommit(null)
      setHeadCommit(null)
      setError(null)

      try {
        const isSameCommit = validBaseSha && validHeadSha && baseSha === headSha

        const isLocal = repo?.type === 'local'
        const getCommitAPI = isLocal
          ? (sha: string) => window.electronAPI.local.getCommit(repo!.localPath!, sha)
          : (sha: string) => window.electronAPI.github.getCommit(repoFullName, sha)

        if (isSameCommit) {
          // Same commit - load once and set both
          try {
            if (!getCommitAPI) {
              throw new Error('getCommit function not available. Please restart the Electron app.')
            }
            const commitData = await getCommitAPI(baseSha!)
            if (commitData) {
              setBaseCommit(commitData)
              setHeadCommit(commitData)
            } else {
              setError('Commit data is empty')
            }
          } catch (error: any) {
            const errorMessage = error?.message || error?.toString() || 'Unknown error'
            console.error('Failed to load commit:', error)
            setError(`Failed to load commit: ${errorMessage}`)
          }
        } else {
          // Different commits - load both in parallel
          const promises: Promise<any>[] = []

          if (validBaseSha) {
            if (!getCommitAPI) {
              setError('getCommit function not available. Please restart the Electron app.')
              return
            }
            promises.push(
              getCommitAPI(baseSha!)
                .then(data => {
                  return { type: 'base', data }
                })
                .catch(error => {
                  const errorMessage = error?.message || error?.toString() || 'Unknown error'
                  setError(`Failed to load base commit: ${errorMessage}`)
                  return { type: 'base', data: null }
                })
            )
          }

          if (validHeadSha) {
            if (!getCommitAPI) {
              setError('getCommit function not available. Please restart the Electron app.')
              return
            }
            promises.push(
              getCommitAPI(headSha!)
                .then(data => {
                  return { type: 'head', data }
                })
                .catch(error => {
                  const errorMessage = error?.message || error?.toString() || 'Unknown error'
                  setError(`Failed to load head commit: ${errorMessage}`)
                  return { type: 'head', data: null }
                })
            )
          }

          const results = await Promise.all(promises)

          for (const result of results) {
            if (result.type === 'base' && result.data) {
              setBaseCommit(result.data)
            } else if (result.type === 'head' && result.data) {
              setHeadCommit(result.data)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load commit details:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCommits()
  }, [repoFullName, baseSha, headSha])

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatMessage = (message: string) => {
    if (!message) return ''
    // Truncate to first line (usually the PR title/subject)
    const firstLine = message.split('\n')[0]
    // Limit to 80 characters
    return firstLine.length > 80 ? firstLine.substring(0, 80) + '...' : firstLine
  }

  const renderCommit = (commit: any, label: string, isBase: boolean = false) => {
    if (!commit) return null

    return (
      <div className={`commit-detail-card ${isBase ? 'base' : 'head'}`}>
        <div className="commit-detail-header">
          <div className="commit-detail-label">{label}</div>
          {commit.url && (
            <a
              href={commit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="commit-external-link"
              title="View on GitHub"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>

        <div className="commit-detail-sha">
          <GitBranch size={14} />
          <code>{commit.shortSha}</code>
          {commit.prNumber && (
            <a
              href={`https://github.com/${repoFullName}/pull/${commit.prNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="commit-pr-link"
              title={`View PR #${commit.prNumber}`}
            >
              <GitPullRequest size={14} />
              <span>PR #{commit.prNumber}</span>
            </a>
          )}
        </div>

        <div className="commit-detail-message">
          <div className="commit-message-full">
            {formatMessage(commit.message)}
          </div>
        </div>

        <div className="commit-detail-meta">
          <div className="commit-meta-item">
            <User size={14} />
            <span>{commit.author.name}</span>
          </div>
          <div className="commit-meta-item">
            <Calendar size={14} />
            <span>{formatDate(commit.author.date)}</span>
          </div>
        </div>

      </div>
    )
  }

  return (
    <div className="commit-details-panel">
      <div className="commit-details-header">
        <h3>Commit Details</h3>
        <button className="commit-details-close" onClick={onClose} title="Close">
          <X size={18} />
        </button>
      </div>

      <div className="commit-details-content">
        {loading ? (
          <div className="commit-details-loading">
            <div className="spinner"></div>
            <span>Loading commit details...</span>
          </div>
        ) : (
          <>
            {error && (
              <div className="commit-details-error">
                <p><strong>Error:</strong> {error}</p>
              </div>
            )}

            {(() => {
              const isSameCommit = baseSha && headSha && baseSha === headSha

              if (isSameCommit) {
                // Same commit - show single commit
                return headCommit || baseCommit ? (
                  renderCommit(headCommit || baseCommit, 'Commit', false)
                ) : !error ? (
                  <div className="commit-details-empty">
                    <p>Failed to load commit</p>
                  </div>
                ) : null
              } else {
                // Different commits - show both
                return (
                  <>
                    {baseSha && baseCommit ? (
                      renderCommit(baseCommit, 'Base Commit', true)
                    ) : baseSha && !loading && !error ? (
                      <div className="commit-details-empty">
                        <p>Failed to load base commit</p>
                      </div>
                    ) : null}

                    {headSha && headCommit ? (
                      renderCommit(headCommit, 'Head Commit', false)
                    ) : headSha && !loading && !error ? (
                      <div className="commit-details-empty">
                        <p>Failed to load head commit</p>
                      </div>
                    ) : null}
                  </>
                )
              }
            })()}

            {!baseSha && !headSha && (
              <div className="commit-details-empty">
                <p>No commits selected</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
