import React from 'react'
import { useAppStore } from '../stores/appStore'
import './FileList.css'

export const FileList: React.FC = () => {
  const { currentComparison, selectedFile, selectFile } = useAppStore()

  if (!currentComparison) {
    return (
      <div className="file-list">
        <div className="file-list-empty">
          No comparison selected
        </div>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'added': return '+'
      case 'modified': return 'M'
      case 'deleted': return '−'
      case 'renamed': return 'R'
      default: return '•'
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'added': return 'status-added'
      case 'modified': return 'status-modified'
      case 'deleted': return 'status-deleted'
      case 'renamed': return 'status-renamed'
      default: return ''
    }
  }

  return (
    <div className="file-list">
      <div className="file-list-header">
        <h3>Changed Files</h3>
        <span className="file-count">{currentComparison.files.length}</span>
      </div>
      
      <div className="file-list-items">
        {currentComparison.files.map((file) => (
          <div
            key={file.path}
            className={`file-item ${selectedFile?.path === file.path ? 'selected' : ''}`}
            onClick={() => selectFile(file)}
          >
            <span className={`file-status ${getStatusClass(file.status)}`}>
              {getStatusIcon(file.status)}
            </span>
            <span className="file-path">{file.path}</span>
            <span className="file-changes">
              {file.additions > 0 && (
                <span className="additions">+{file.additions}</span>
              )}
              {file.deletions > 0 && (
                <span className="deletions">−{file.deletions}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
