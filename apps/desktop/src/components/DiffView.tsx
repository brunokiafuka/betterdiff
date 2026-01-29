import { useState, useEffect } from 'react'
import { DiffEditor, Editor } from '@monaco-editor/react'
import { useAppStore } from '../stores/appStore'
import './DiffView.css'

export const DiffView: React.FC = () => {
  const { selectedFile, showBlame, viewMode, currentComparison } = useAppStore()
  const [oldContent, setOldContent] = useState('')
  const [newContent, setNewContent] = useState('')
  const [loading, setLoading] = useState(false)

  // Get the file path from selectedFile or from comparison's first file
  const filePath = selectedFile?.path || currentComparison?.files?.[0]?.path

  useEffect(() => {
    if (!currentComparison || !filePath) {
      return
    }

    const loadFileContents = async () => {
      setLoading(true)
      try {
        const { repo, baseRef, headRef } = currentComparison

        // Check if this is a "same commit" comparison (no actual diff)
        if (baseRef.sha === headRef.sha) {
          // Same commit - load content only once
          const content = repo.type === 'local'
            ? await window.electronAPI.local.getFileContent(repo.localPath!, baseRef.name, filePath)
            : await window.electronAPI.github.getFileContent(repo.fullName, baseRef.sha, filePath)
          setOldContent(content)
          setNewContent(content)
        } else {
          // Different commits - fetch both versions
          const [oldData, newData] = await Promise.all([
            repo.type === 'local'
              ? window.electronAPI.local.getFileContent(repo.localPath!, baseRef.name, filePath)
              : window.electronAPI.github.getFileContent(repo.fullName, baseRef.sha, filePath),
            repo.type === 'local'
              ? window.electronAPI.local.getFileContent(repo.localPath!, headRef.name, filePath)
              : window.electronAPI.github.getFileContent(repo.fullName, headRef.sha, filePath)
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
  }, [currentComparison, filePath])

  if (!currentComparison || !filePath) {
    return (
      <div className="diff-view">
        <div className="diff-empty">
          Select commits from the history to view diff
        </div>
      </div>
    )
  }

  // Check if showing same content (no diff)
  const isSameContent = currentComparison?.baseRef.sha === currentComparison?.headRef.sha

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

  // Get stats from comparison files if available
  const fileStats = currentComparison.files?.find(f => f.path === filePath)

  return (
    <div className="diff-view">
      <div className="diff-header">
        <div className="diff-file-path">
          {filePath}
          {isSameContent && (
            <span className="same-commit-badge">Viewing at {currentComparison.baseRef.name}</span>
          )}
          {!isSameContent && (
            <span className="diff-refs">
              {currentComparison.baseRef.name} → {currentComparison.headRef.name}
            </span>
          )}
        </div>
        {!isSameContent && fileStats && (
          <div className="diff-stats">
            <span className="stat-additions">+{fileStats.additions}</span>
            <span className="stat-deletions">−{fileStats.deletions}</span>
          </div>
        )}
      </div>
      
      <div className="diff-editor-container">
        {loading ? (
          <div className="diff-loading">
            <div className="spinner"></div>
            <span>Loading file contents...</span>
          </div>
        ) : isSameContent ? (
          // Show single Monaco editor for same content (no diff needed)
          <Editor
            height="100%"
            language={getLanguage(filePath)}
            value={newContent}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              fontSize: 13,
              lineNumbers: 'on',
              renderLineHighlight: 'all',
              automaticLayout: true,
            }}
          />
        ) : (
          // Show diff editor for different commits
          <DiffEditor
            height="100%"
            language={getLanguage(filePath)}
            original={oldContent}
            modified={newContent}
            theme="vs-dark"
            options={{
              renderSideBySide: viewMode === 'side-by-side',
              readOnly: true,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              fontSize: 13,
              lineNumbers: 'on',
              renderLineHighlight: 'all',
              glyphMargin: showBlame,
              automaticLayout: true,
            }}
          />
        )}
      </div>
    </div>
  )
}
