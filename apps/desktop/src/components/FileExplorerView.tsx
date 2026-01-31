import { useState, useEffect, useCallback } from 'react'
import { Info } from 'lucide-react'
import { FileDiffViewer as UiFileDiffViewer } from '@whodidit/ui'
import { FileTreePanel } from './FileTreePanel'
import { FileHistoryPanel } from './FileHistoryPanel'
import { CommitDetailsPanel } from './CommitDetailsPanel'
import { AIPanel } from './AIPanel'
import { HotspotPanel } from './HotspotPanel'
import { FolderOpen, X } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import './FileExplorerView.css'

export const FileExplorerView: React.FC = () => {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [selectedCommits, setSelectedCommits] = useState<{ base: string; head: string } | null>(null)
  const [showDetailsPanel, setShowDetailsPanel] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [showHotspotsPanel, setShowHotspotsPanel] = useState(false)
  const { currentRepo } = useAppStore()

  // File content state
  const [oldContent, setOldContent] = useState('')
  const [newContent, setNewContent] = useState('')
  const [loading, setLoading] = useState(false)

  // Load file contents when commits change
  useEffect(() => {
    if (!selectedCommits?.base || !selectedCommits?.head || !currentRepo || !selectedFilePath) {
      return
    }

    const loadFileContents = async () => {
      setLoading(true)
      try {
        const isLocal = currentRepo.type === 'local'
        if (selectedCommits.base === selectedCommits.head) {
          // Same commit - load content only once
          const content = isLocal
            ? await window.electronAPI.local.getFileContent(currentRepo.localPath!, selectedCommits.base, selectedFilePath)
            : await window.electronAPI.github.getFileContent(currentRepo.fullName, selectedCommits.base, selectedFilePath)
          setOldContent(content)
          setNewContent(content)
        } else {
          // Different commits - fetch both versions
          const [oldData, newData] = await Promise.all([
            isLocal
              ? window.electronAPI.local.getFileContent(currentRepo.localPath!, selectedCommits.base, selectedFilePath)
              : window.electronAPI.github.getFileContent(currentRepo.fullName, selectedCommits.base, selectedFilePath),
            isLocal
              ? window.electronAPI.local.getFileContent(currentRepo.localPath!, selectedCommits.head, selectedFilePath)
              : window.electronAPI.github.getFileContent(currentRepo.fullName, selectedCommits.head, selectedFilePath)
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
  }, [selectedCommits, currentRepo, selectedFilePath])

  // Clear state when repo changes
  useEffect(() => {
    setSelectedFilePath(null)
    setSelectedCommits(null)
    setShowDetailsPanel(false)
    setShowAIPanel(false)
    setShowHotspotsPanel(false)
  }, [currentRepo])

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

  // Keyboard shortcut: Cmd+A to open AI panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        if (currentRepo) {
          setShowAIPanel(true)
          setShowDetailsPanel(false) // Close details panel if open
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentRepo])

  // Listen for AI panel open event from AppShell
  useEffect(() => {
    const handleOpenAIPanel = () => {
      setShowAIPanel(true)
      setShowDetailsPanel(false)
      setShowHotspotsPanel(false)
    }

    window.addEventListener('open-ai-panel', handleOpenAIPanel)
    return () => window.removeEventListener('open-ai-panel', handleOpenAIPanel)
  }, [])

  // Listen for Hotspots panel open event from AppShell
  useEffect(() => {
    const handleOpenHotspotsPanel = () => {
      setShowHotspotsPanel(true)
      setShowAIPanel(false)
      setShowDetailsPanel(false)
    }

    window.addEventListener('open-hotspots-panel', handleOpenHotspotsPanel)
    return () => window.removeEventListener('open-hotspots-panel', handleOpenHotspotsPanel)
  }, [])

  return (
    <div className="file-explorer-view">
      {/* Left Panel - File Tree */}
      <div className="file-explorer-left">
        <FileTreePanel />
      </div>

      {/* Middle Panel - Split into Diff/Content and History */}
      <div className={`file-explorer-right ${(showAIPanel || showDetailsPanel || showHotspotsPanel) ? 'with-details' : ''}`}>
        {selectedFilePath ? (
          <>
            {/* Top: Diff or Content Viewer */}
            <div className="file-explorer-content">
              <UiFileDiffViewer
                filePath={selectedFilePath}
                baseSha={selectedCommits?.base || null}
                headSha={selectedCommits?.head || null}
                oldContent={oldContent}
                newContent={newContent}
                loading={loading}
                onDetailsClick={() => setShowDetailsPanel(true)}
                detailsLabel="Details"
                detailsIcon={<Info size={16} />}
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
              <div className="empty-icon">
                <FolderOpen size={48} />
              </div>
              <h3>Select a file to view</h3>
              <p>Choose any file from the tree to see its content and history</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - AI, Commit Details, or Hotspots */}
      {(showAIPanel || showDetailsPanel || showHotspotsPanel) && (
        <div className="file-explorer-details">
          {showAIPanel ? (
            <AIPanel onClose={() => setShowAIPanel(false)} />
          ) : showHotspotsPanel ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#252526' }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #3c3c3c',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#2d2d30'
              }}>
                <span style={{ color: '#cccccc', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hotspots</span>
                <button
                  onClick={() => setShowHotspotsPanel(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.color = '#cccccc'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#999'
                  }}
                  title="Close Hotspots"
                >
                  <X size={16} />
                </button>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <HotspotPanel />
              </div>
            </div>
          ) : (
            selectedCommits && (
              <CommitDetailsPanel
                repoFullName={currentRepo?.fullName || ''}
                repo={currentRepo || undefined}
                baseSha={selectedCommits.base}
                headSha={selectedCommits.head}
                onClose={() => setShowDetailsPanel(false)}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}
