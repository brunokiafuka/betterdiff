import { useState, useEffect, useCallback } from 'react'
import { FileTreePanel } from './FileTreePanel'
import { FileHistoryPanel } from './FileHistoryPanel'
import { FileDiffViewer } from './FileDiffViewer'
import { CommitDetailsPanel } from './CommitDetailsPanel'
import { FolderOpen } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import './FileExplorerView.css'

export const FileExplorerView: React.FC = () => {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [selectedCommits, setSelectedCommits] = useState<{ base: string; head: string } | null>(null)
  const [showDetailsPanel, setShowDetailsPanel] = useState(false)
  const { currentRepo } = useAppStore()

  // Listen for file selection events from FileTreePanel
  useEffect(() => {
    const handleFileSelected = (event: CustomEvent) => {
      const path = event.detail.path
      setSelectedFilePath(path)
      setSelectedCommits(null) // Reset commits when new file is selected
    }

    window.addEventListener('file-selected', handleFileSelected as EventListener)
    return () => {
      window.removeEventListener('file-selected', handleFileSelected as EventListener)
    }
  }, [])

  // Callback when commits are selected in the history panel
  const handleCommitsSelected = useCallback((baseSha: string, headSha: string) => {
    setSelectedCommits({ base: baseSha, head: headSha })
  }, [])

  return (
    <div className="file-explorer-view">
      {/* Left Panel - File Tree */}
      <div className="file-explorer-left">
        <FileTreePanel />
      </div>

      {/* Middle Panel - Split into Diff/Content and History */}
      <div className={`file-explorer-right ${showDetailsPanel ? 'with-details' : ''}`}>
        {selectedFilePath ? (
          <>
            {/* Top: Diff or Content Viewer */}
            <div className="file-explorer-content">
              <FileDiffViewer
                filePath={selectedFilePath}
                baseSha={selectedCommits?.base || null}
                headSha={selectedCommits?.head || null}
                repoFullName={currentRepo?.fullName || ''}
                onDetailsClick={() => setShowDetailsPanel(true)}
              />
            </div>

            {/* Bottom: History Panel for commit selection */}
            <div className="file-explorer-history">
              <FileHistoryPanel
                filePath={selectedFilePath}
                onCommitsSelected={handleCommitsSelected}
              />
            </div>
          </>
        ) : (
          <div className="file-explorer-empty">
            <div className="empty-state">
              <FolderOpen size={48} className="empty-icon" />
              <h3>Select a file to view</h3>
              <p>Choose any file from the tree to see its content and history</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Commit Details */}
      {showDetailsPanel && selectedCommits && (
        <div className="file-explorer-details">
          <CommitDetailsPanel
            repoFullName={currentRepo?.fullName || ''}
            baseSha={selectedCommits.base}
            headSha={selectedCommits.head}
            onClose={() => setShowDetailsPanel(false)}
          />
        </div>
      )}
    </div>
  )
}
