import { useState, useEffect, useMemo } from 'react'
import { useSignals } from '@preact/signals-react/runtime'
import { MultiFileDiff, File } from '@pierre/diffs/react'
import type { FileContents } from '@pierre/diffs'
import { useGetFileContent } from '../services/github'
import './FileDiffViewer.css'

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
  useSignals()
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

  // Create stable file objects for @pierre/diffs
  // The library uses reference equality to detect changes
  const oldFile: FileContents = useMemo(() => ({
    name: filePath,
    contents: oldContent,
  }), [filePath, oldContent])

  const newFile: FileContents = useMemo(() => ({
    name: filePath,
    contents: newContent,
  }), [filePath, newContent])

  if (!baseSha || !headSha) {
    return (
      <div className="file-diff-viewer">
        <div className="diff-empty">
          Select commits from the history below to view the file
        </div>
      </div>
    )
  }

  const isSameCommit = baseSha === headSha

  return (
    <div className="file-diff-viewer">
      <div className="diff-header">
        <div className="diff-file-path">
          {filePath}
        </div>
      </div>

      <div className="diff-editor-container">
        {loading ? (
          <div className="diff-loading">
            <div className="spinner"></div>
            <span>Loading file contents...</span>
          </div>
        ) : isSameCommit ? (
          // Show single file viewer for viewing file at one commit
          <File
            file={newFile}
            options={{
              theme: 'pierre-dark',
              disableFileHeader: true,
              overflow: 'scroll',
            }}
            className="pierre-diff-file"
          />
        ) : (
          // Show diff viewer for comparing two commits
          <MultiFileDiff
            oldFile={oldFile}
            newFile={newFile}
            options={{
              theme: 'pierre-dark',
              diffStyle: 'split',
              diffIndicators: 'bars',
              hunkSeparators: 'line-info',
              lineDiffType: 'word-alt',
              disableFileHeader: true,
              overflow: 'scroll',
            }}
            className="pierre-diff-viewer"
          />
        )}
      </div>
    </div>
  )
}
