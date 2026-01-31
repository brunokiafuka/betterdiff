import { useState, useEffect } from 'react'
import { X, ExternalLink, User, Calendar, GitBranch, GitPullRequest } from 'lucide-react'
import { CommitDetailsPanel as UiCommitDetailsPanel } from '@whodidit/ui'

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

  return (
    <UiCommitDetailsPanel
      repoFullName={repoFullName}
      baseSha={baseSha}
      headSha={headSha}
      baseCommit={baseCommit}
      headCommit={headCommit}
      loading={loading}
      error={error}
      showHeader
      title="Commit Details"
      onClose={onClose}
      closeIcon={<X size={18} />}
      linkIcon={<ExternalLink size={14} />}
      branchIcon={<GitBranch size={14} />}
      prIcon={<GitPullRequest size={14} />}
      userIcon={<User size={14} />}
      calendarIcon={<Calendar size={14} />}
    />
  )
}
