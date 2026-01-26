import { useParams, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { FileExplorerView } from '../components/FileExplorerView'
import { setRepo } from '../stores/appStore'
import { useGetRepo } from '../services/github'
import type { Repo } from '../types'

export function RepoViewerRoute() {
  const { owner, name } = useParams({ from: '/repo/$owner/$name' })
  const search = useSearch({ from: '/repo/$owner/$name' })


  const fullName = `${owner}/${name}`
  const getRepo = useGetRepo()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadRepo = async () => {
      if (!owner || !name) return

      setLoading(true)
      try {
        const repoData = await getRepo({ owner, name })

        if (repoData) {
          setRepo(repoData)
        } else {
          const fallbackRepo: Repo = {
            id: fullName,
            owner,
            name,
            fullName,
            defaultBranch: 'main',
            type: 'github',
          }
          setRepo(fallbackRepo)
        }
      } catch (err: any) {
        console.error('Failed to load repo:', err)
        const fallbackRepo: Repo = {
          id: fullName,
          owner,
          name,
          fullName,
          defaultBranch: 'main',
          type: 'github',
        }
        setRepo(fallbackRepo)
      } finally {
        setLoading(false)
      }
    }

    loadRepo()
  }, [owner, name, fullName, getRepo])

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p>Loading repository...</p>
      </div>
    )
  }

  return (
    <FileExplorerView
      initialPath={search?.path}
      initialBaseSha={search?.oldcommit}
      initialHeadSha={search?.newcommit}
    />
  )
}
