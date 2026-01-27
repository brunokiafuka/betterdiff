import { useState, useEffect } from 'react'
import { ExternalLink, User, Calendar, GitBranch, GitPullRequest } from 'lucide-react'
import { useGetCommit } from '../services/github'
import './CommitDetailsPanel.css'

interface CommitDetailsPanelProps {
  repoFullName: string
  baseSha: string | null
  headSha: string | null
}

export const CommitDetailsPanel: React.FC<CommitDetailsPanelProps> = ({
  repoFullName,
  baseSha,
  headSha,
}) => {
  const getCommit = useGetCommit()
  const [baseCommit, setBaseCommit] = useState<any>(null)
  const [headCommit, setHeadCommit] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!repoFullName || (!baseSha && !headSha)) {
      setBaseCommit(null)
      setHeadCommit(null)
      return
    }

    const loadCommits = async () => {
      setLoading(true)
      setError(null)

      try {
        const isSameCommit = baseSha && headSha && baseSha === headSha

        if (isSameCommit && baseSha) {
          const commit = await getCommit({ repoFullName, sha: baseSha })
          setBaseCommit(commit)
          setHeadCommit(commit)
        } else {
          const promises: Promise<any>[] = []
          if (baseSha) {
            promises.push(
              getCommit({ repoFullName, sha: baseSha }).then(data => ({ type: 'base', data }))
            )
          }
          if (headSha) {
            promises.push(
              getCommit({ repoFullName, sha: headSha }).then(data => ({ type: 'head', data }))
            )
          }

          const results = await Promise.all(promises)
          results.forEach(({ type, data }) => {
            if (type === 'base') setBaseCommit(data)
            if (type === 'head') setHeadCommit(data)
          })
        }
      } catch (err: any) {
        console.error('Failed to load commits:', err)
        setError(err.message || 'Failed to load commit details')
      } finally {
        setLoading(false)
      }
    }

    loadCommits()
  }, [repoFullName, baseSha, headSha, getCommit])

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
          <code>{commit.shortSha || commit.sha?.substring(0, 7)}</code>
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
            <span>{commit.author?.name || 'Unknown'}</span>
          </div>
          <div className="commit-meta-item">
            <Calendar size={14} />
            <span>{formatDate(commit.author?.date)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="commit-details-panel">
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

