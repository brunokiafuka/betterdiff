import React from 'react'
import { DiffEditor } from '@monaco-editor/react'
import { useAppStore } from '../stores/appStore'
import './DiffView.css'

export const DiffView: React.FC = () => {
  const { selectedFile, showBlame, viewMode } = useAppStore()

  if (!selectedFile) {
    return (
      <div className="diff-view">
        <div className="diff-empty">
          Select a file to view diff
        </div>
      </div>
    )
  }

  // Mock content for now - will fetch from GitHub API
  const originalContent = '// Original content\nfunction hello() {\n  console.log("old");\n}'
  const modifiedContent = '// Modified content\nfunction hello() {\n  console.log("new");\n  return true;\n}'

  return (
    <div className="diff-view">
      <div className="diff-header">
        <div className="diff-file-path">
          {selectedFile.path}
        </div>
        <div className="diff-stats">
          <span className="stat-additions">+{selectedFile.additions}</span>
          <span className="stat-deletions">−{selectedFile.deletions}</span>
        </div>
      </div>
      
      <div className="diff-editor-container">
        <DiffEditor
          height="100%"
          language="typescript"
          original={originalContent}
          modified={modifiedContent}
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
          }}
        />
      </div>
    </div>
  )
}
