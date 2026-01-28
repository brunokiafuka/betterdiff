import { useState, useEffect, useCallback } from 'react'
import { useSignals } from '@preact/signals-react/runtime'
import { useNavigate, useParams, } from '@tanstack/react-router'
import { FolderOpen } from 'lucide-react'
import { currentRepo } from '../stores/appStore'
import { FileTreePanel } from './FileTreePanel'
import { FileDiffViewer } from './FileDiffViewer'
import { FileHistoryPanel } from './FileHistoryPanel'
import { RightDetailsPanel } from './RightDetailsPanel'
import { useWindowInfo } from './WindowProvider'
import './FileExplorerView.css'

interface FileExplorerViewProps {
  initialPath?: string
  initialBaseSha?: string
  initialHeadSha?: string
}

export const FileExplorerView: React.FC<FileExplorerViewProps> = ({
  initialPath,
  initialBaseSha,
  initialHeadSha,
}) => {
  useSignals()
  const navigate = useNavigate()
  const { owner, name } = useParams({ from: '/repo/$owner/$name' })
  const repo = currentRepo.value
  const { isMobile } = useWindowInfo()
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(initialPath || null)
  const [selectedCommits, setSelectedCommits] = useState<{ base: string; head: string } | null>(
    initialBaseSha && initialHeadSha ? { base: initialBaseSha, head: initialHeadSha } : null
  )
  const [activePanelTab, setActivePanelTab] = useState<'details' | 'hotspot' | 'ai' | null>(null)

  // Update URL when file path or commits change
  useEffect(() => {
    if (!owner || !name) return

    const searchParams: Record<string, string | undefined> = {}

    if (selectedFilePath) {
      searchParams.path = selectedFilePath
    }

    if (selectedCommits?.base) {
      searchParams.oldcommit = selectedCommits.base
    }

    if (selectedCommits?.head) {
      searchParams.newcommit = selectedCommits.head
    }

    // Only update URL if there are changes
    const currentSearch = new URLSearchParams(window.location.search)
    const hasChanges =
      currentSearch.get('path') !== searchParams.path ||
      currentSearch.get('oldcommit') !== searchParams.oldcommit ||
      currentSearch.get('newcommit') !== searchParams.newcommit

    if (hasChanges) {
      navigate({
        to: '/repo/$owner/$name',
        params: { owner, name },
        search: searchParams as any,
        replace: true, // Use replace to avoid cluttering history
      })
    }
  }, [selectedFilePath, selectedCommits, owner, name, navigate])

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

  // Clear state when repo changes
  useEffect(() => {
    setSelectedFilePath(null)
    setSelectedCommits(null)
  }, [repo])

  // Listen for panel open events from AppShell
  useEffect(() => {
    const handleOpenHotspots = () => {
      setActivePanelTab('hotspot')
    }
    const handleOpenAI = () => {
      setActivePanelTab('ai')
    }

    window.addEventListener('open-hotspots-panel', handleOpenHotspots)
    window.addEventListener('open-ai-panel', handleOpenAI)

    return () => {
      window.removeEventListener('open-hotspots-panel', handleOpenHotspots)
      window.removeEventListener('open-ai-panel', handleOpenAI)
    }
  }, [])

  // Initialize from URL params on mount
  useEffect(() => {
    if (initialPath && initialPath !== selectedFilePath) {
      setSelectedFilePath(initialPath)
    }
    if (initialBaseSha && initialHeadSha) {
      setSelectedCommits({ base: initialBaseSha, head: initialHeadSha })
    }
  }, []) // Only run on mount

  // Callback when commits are selected in the history panel
  const handleCommitsSelected = useCallback((baseSha: string, headSha: string) => {
    setSelectedCommits({ base: baseSha, head: headSha })
  }, [])

  if (isMobile) {
    return (
      <div className="file-explorer-view">
        <div className="file-explorer-empty">
          <div className="empty-state">
            <div className="empty-icon">
              <FolderOpen size={48} />
            </div>
            <h3>Desktop-only feature</h3>
            <p>
              The code explorer is optimized for larger screens and is only available on desktop devices.
              Please switch to a desktop browser to use this view.
            </p>
            <button
              className="btn-repos"
              onClick={() => navigate({ to: '/repos' })}
            >
              Back to Repositories
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!repo) {
    return (
      <div className="file-explorer-view">
        <div className="file-explorer-empty">
          <div className="empty-state">
            <div className="empty-icon">
              <FolderOpen size={48} />
            </div>
            <h3>No repository selected</h3>
            <p>Select a repository to view files</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="file-explorer-view">
      {/* Left Panel - File Tree */}
      <div className="file-explorer-left">
        <FileTreePanel initialSelectedFile={initialPath} />
      </div>

      {/* Right Panel - Split into Diff/Content and History */}
      <div className={`file-explorer-right with-details-panel ${activePanelTab ? 'panel-content-open' : ''}`}>
        {selectedFilePath ? (
          <>
            {/* Top: Diff or Content Viewer */}
            <div className="file-explorer-content">
              <FileDiffViewer
                filePath={selectedFilePath}
                baseSha={selectedCommits?.base || null}
                headSha={selectedCommits?.head || null}
                repoFullName={repo.fullName}
                repo={repo}
              />
            </div>

            {/* Bottom: History Panel for commit selection */}
            <div className="file-explorer-history">
              <FileHistoryPanel
                filePath={selectedFilePath}
                onCommitsSelected={handleCommitsSelected}
                initialBaseSha={initialBaseSha}
                initialHeadSha={initialHeadSha}
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

      {/* Right Details Panel - Tabs always visible, content only when active */}
      <RightDetailsPanel
        repoFullName={repo.fullName}
        baseSha={selectedCommits?.base || null}
        headSha={selectedCommits?.head || null}
        activeTab={activePanelTab}
        onTabChange={(tab) => setActivePanelTab(tab === activePanelTab ? null : tab)}
      />
    </div>
  )
}
