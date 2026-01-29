import { useState, useEffect } from 'react'
import { DiffEditor, Editor } from '@monaco-editor/react'
import { Info } from 'lucide-react'
import { useUiStore } from '../stores/uiStore'
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
  repo,
  onDetailsClick
}) => {
  const { startAction, finishAction, failAction, addToast } = useUiStore()
  const [oldContent, setOldContent] = useState('')
  const [newContent, setNewContent] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!baseSha || !headSha || !repoFullName || !filePath) {
      return
    }

    const loadFileContents = async () => {
      setLoading(true)
      startAction('loadFileContents', 'Loading file contents...')
      try {
        const isLocal = repo?.type === 'local'
        if (baseSha === headSha) {
          // Same commit - load content only once
          const content = isLocal
            ? await window.electronAPI.local.getFileContent(repo!.localPath!, baseSha, filePath)
            : await window.electronAPI.github.getFileContent(repoFullName, baseSha, filePath)
          setOldContent(content)
          setNewContent(content)
        } else {
          // Different commits - fetch both versions
          const [oldData, newData] = await Promise.all([
            isLocal
              ? window.electronAPI.local.getFileContent(repo!.localPath!, baseSha, filePath)
              : window.electronAPI.github.getFileContent(repoFullName, baseSha, filePath),
            isLocal
              ? window.electronAPI.local.getFileContent(repo!.localPath!, headSha, filePath)
              : window.electronAPI.github.getFileContent(repoFullName, headSha, filePath)
          ])
          setOldContent(oldData)
          setNewContent(newData)
        }
      } catch (error) {
        console.error('Failed to load file contents:', error)
        setOldContent('// Failed to load content')
        setNewContent('// Failed to load content')
        failAction('loadFileContents', 'Failed to load file contents')
        addToast('error', 'Failed to load file contents')
      } finally {
        setLoading(false)
        finishAction('loadFileContents')
      }
    }

    loadFileContents()
  }, [baseSha, headSha, repoFullName, filePath, repo, startAction, finishAction, failAction, addToast])

  // Detect language from file extension
  const getLanguage = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase()
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
      'css': 'css',
      'scss': 'scss',
      'html': 'html',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sh': 'shell',
      'bash': 'shell',
    }
    return langMap[ext || ''] || 'plaintext'
  }

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
        {baseSha && headSha && onDetailsClick && (
          <button
            className="diff-details-btn"
            onClick={onDetailsClick}
            title="View commit details"
          >
            <Info size={16} />
            <span>Details</span>
          </button>
        )}
      </div>

      <div className="diff-editor-container">
        {loading ? (
          <div className="diff-loading">
            <div className="spinner"></div>
            <span>Loading file contents...</span>
          </div>
        ) : isSameCommit ? (
          // Show single Monaco editor for viewing file at one commit
          <Editor
            height="100%"
            language={getLanguage(filePath)}
            value={newContent}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              fontSize: 10,
              lineNumbers: 'on',
              renderLineHighlight: 'all',
              automaticLayout: true,
            }}
          />
        ) : (
          // Show diff editor for comparing two commits
          <DiffEditor
            height="100%"
            language={getLanguage(filePath)}
            original={oldContent}
            modified={newContent}
            theme="vs-dark"
            options={{
              renderSideBySide: true,
              readOnly: true,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              fontSize: 10,
              lineNumbers: 'on',
              renderLineHighlight: 'all',
              automaticLayout: true,
            }}
          />
        )}
      </div>
    </div>
  )
}
