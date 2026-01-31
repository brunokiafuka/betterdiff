import { useState, useEffect } from 'react'
import { ExternalLink, User, Calendar, GitBranch, GitPullRequest } from 'lucide-react'
import { CommitDetailsPanel as UiCommitDetailsPanel } from '@whodidit/ui'
import { useGetCommit } from '../services/github'

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

  return (
    <UiCommitDetailsPanel
      repoFullName={repoFullName}
      baseSha={baseSha}
      headSha={headSha}
      baseCommit={baseCommit}
      headCommit={headCommit}
      loading={loading}
      error={error}
      linkIcon={<ExternalLink size={14} />}
      branchIcon={<GitBranch size={14} />}
      prIcon={<GitPullRequest size={14} />}
      userIcon={<User size={14} />}
      calendarIcon={<Calendar size={14} />}
    />
  )
}

