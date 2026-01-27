import { Info, Flame, Sparkles } from 'lucide-react'
import { CommitDetailsPanel } from './CommitDetailsPanel'
import { HotspotPanel } from './HotspotPanel'
import { AIPanel } from './AIPanel'
import './RightDetailsPanel.css'

type PanelTab = 'details' | 'hotspot' | 'ai'

interface RightDetailsPanelProps {
  repoFullName: string
  baseSha: string | null
  headSha: string | null
  activeTab: PanelTab | null
  onTabChange: (tab: PanelTab | null) => void
}

export const RightDetailsPanel: React.FC<RightDetailsPanelProps> = ({
  repoFullName,
  baseSha,
  headSha,
  activeTab,
  onTabChange,
}) => {
  const handleTabClick = (tab: PanelTab) => {
    // Toggle: if clicking the active tab, close the panel
    if (tab === activeTab) {
      onTabChange(null)
    } else {
      onTabChange(tab)
    }
  }

  return (
    <div className={`right-details-panel ${activeTab ? 'has-content' : ''}`}>
      {/* Vertical Tabs on Right Edge */}
      <div className="right-panel-tabs">
        <button
          className={`right-panel-tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => handleTabClick('details')}
          title="Commit Details"
        >
          <Info size={18} />
          <span className="tab-label">Details</span>
        </button>
        <button
          className={`right-panel-tab ${activeTab === 'hotspot' ? 'active' : ''}`}
          onClick={() => handleTabClick('hotspot')}
          title="Hotspots"
        >
          <Flame size={18} />
          <span className="tab-label">Hotspot</span>
        </button>
        <button
          className={`right-panel-tab ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => handleTabClick('ai')}
          title="AI Assistant"
        >
          <Sparkles size={18} />
          <span className="tab-label">AI</span>
        </button>
      </div>

      {/* Content Area - Only visible when a tab is active */}
      {activeTab && (
        <div className="right-panel-content">


          <div className="right-panel-body">
            {activeTab === 'details' && (
              <CommitDetailsPanel
                repoFullName={repoFullName}
                baseSha={baseSha}
                headSha={headSha}
              />
            )}
            {activeTab === 'hotspot' && <HotspotPanel />}
            {activeTab === 'ai' && <AIPanel />}
          </div>
        </div>
      )}
    </div>
  )
}
