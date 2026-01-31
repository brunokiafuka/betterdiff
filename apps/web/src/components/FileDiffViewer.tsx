import { useState, useEffect } from 'react'
import { FileDiffViewer as UiFileDiffViewer } from '@whodidit/ui'
import { useGetFileContent } from '../services/github'

interface FileDiffViewerProps {
  filePath: string
  baseSha: string | null
  headSha: string | null
  repoFullName: string
  repo?: { type?: 'github' | 'local'; localPath?: string }
  onDetailsClick?: () => void
}

export const FileDiffViewer: React.FC<FileDiffViewerProps> = ({
  filePath,
  baseSha,
  headSha,
  repoFullName,
}) => {
  const getFileContent = useGetFileContent()
  const [oldContent, setOldContent] = useState('')
  const [newContent, setNewContent] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!baseSha || !headSha || !repoFullName || !filePath) {
      return
    }

    const loadFileContents = async () => {
      setLoading(true)
      try {
        if (baseSha === headSha) {
          // Same commit - load content only once
          const content = await getFileContent({
            repoFullName,
            ref: baseSha,
            filePath
          })
          setOldContent(content)
          setNewContent(content)
        } else {
          // Different commits - fetch both versions
          const [oldData, newData] = await Promise.all([
            getFileContent({
              repoFullName,
              ref: baseSha,
              filePath
            }),
            getFileContent({
              repoFullName,
              ref: headSha,
              filePath
            })
          ])
          setOldContent(oldData)
          setNewContent(newData)
        }
      } catch (error) {
        console.error('Failed to load file contents:', error)
        setOldContent('// Failed to load content')
        setNewContent('// Failed to load content')
      } finally {
        setLoading(false)
      }
    }

    loadFileContents()
  }, [baseSha, headSha, repoFullName, filePath, getFileContent])

  return (
    <UiFileDiffViewer
      filePath={filePath}
      baseSha={baseSha}
      headSha={headSha}
      oldContent={oldContent}
      newContent={newContent}
      loading={loading}
    />
  )
}
