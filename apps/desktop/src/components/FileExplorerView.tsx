import { useState, useEffect, useCallback } from 'react'
import { FileTreePanel } from './FileTreePanel'
import { FileHistoryPanel } from './FileHistoryPanel'
import { FileDiffViewer } from './FileDiffViewer'
import { CommitDetailsPanel } from './CommitDetailsPanel'
import { AIPanel } from './AIPanel'
import { HotspotPanel } from './HotspotPanel'
import { FolderOpen, X, Sparkles, Flame, Info } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useUiStore } from '../stores/uiStore'
import './FileExplorerView.css'

export const FileExplorerView: React.FC = () => {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [selectedCommits, setSelectedCommits] = useState<{ base: string; head: string } | null>(null)
  const [showDetailsPanel, setShowDetailsPanel] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [showHotspotsPanel, setShowHotspotsPanel] = useState(false)
  const { currentRepo } = useAppStore()
  const { addToast } = useUiStore()

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

  const openDetailsPanel = () => {
    if (!selectedCommits) {
      addToast('info', 'Select commits to view details')
      return
    }
    setShowDetailsPanel(true)
    setShowAIPanel(false)
    setShowHotspotsPanel(false)
  }

  const openAIPanel = () => {
    setShowAIPanel(true)
    setShowDetailsPanel(false)
    setShowHotspotsPanel(false)
  }

  const openHotspotsPanel = () => {
    setShowHotspotsPanel(true)
    setShowAIPanel(false)
    setShowDetailsPanel(false)
  }

  // Keyboard shortcut: Cmd+A to open AI panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        if (currentRepo) {
          openAIPanel()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentRepo])

  // Listen for AI panel open event from AppShell
  useEffect(() => {
    const handleOpenAIPanel = () => {
      openAIPanel()
    }

    window.addEventListener('open-ai-panel', handleOpenAIPanel)
    return () => window.removeEventListener('open-ai-panel', handleOpenAIPanel)
  }, [])

  // Listen for Hotspots panel open event from AppShell
  useEffect(() => {
    const handleOpenHotspotsPanel = () => {
      openHotspotsPanel()
    }

    window.addEventListener('open-hotspots-panel', handleOpenHotspotsPanel)
    return () => window.removeEventListener('open-hotspots-panel', handleOpenHotspotsPanel)
  }, [])

  // Listen for Details panel open event from AppShell
  useEffect(() => {
    const handleOpenDetailsPanel = () => {
      openDetailsPanel()
    }

    window.addEventListener('open-details-panel', handleOpenDetailsPanel)
    return () => window.removeEventListener('open-details-panel', handleOpenDetailsPanel)
  }, [selectedCommits, addToast])

  const hasSidePanel = showAIPanel || showDetailsPanel || showHotspotsPanel

  return (
    <div className={`file-explorer-view ${hasSidePanel ? 'with-side-panel' : ''}`}>
      {/* Left Panel - File Tree */}
      <div className="file-explorer-left">
        <FileTreePanel />
      </div>

      {/* Middle Panel - Split into Diff/Content and History */}
      <div className={`file-explorer-right ${hasSidePanel ? 'with-details' : ''}`}>
        {selectedFilePath ? (
          <>
            {/* Top: Diff or Content Viewer */}
            <div className="file-explorer-content">
              <FileDiffViewer
                filePath={selectedFilePath}
                baseSha={selectedCommits?.base || null}
                headSha={selectedCommits?.head || null}
                repoFullName={currentRepo?.fullName || ''}
                repo={currentRepo || undefined}
                onDetailsClick={openDetailsPanel}
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

      {currentRepo && (
        <div className="side-rail">
          <button
            className={`side-rail-btn ${showDetailsPanel ? 'active' : ''}`}
            onClick={openDetailsPanel}
            title="Details"
            aria-label="Details"
          >
            <Info size={16} />
            <span>Details</span>
          </button>
          <button
            className={`side-rail-btn ${showHotspotsPanel ? 'active' : ''}`}
            onClick={openHotspotsPanel}
            title="Hotspots"
            aria-label="Hotspots"
          >
            <Flame size={16} />
            <span>Hotspots</span>
          </button>
          <button
            className={`side-rail-btn ${showAIPanel ? 'active' : ''}`}
            onClick={openAIPanel}
            title="AI Analysis"
            aria-label="AI Analysis"
          >
            <Sparkles size={16} />
            <span>AI</span>
          </button>
        </div>
      )}
    </div>
  )
}
