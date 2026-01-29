import React from 'react'
import { useAppStore } from '../stores/appStore'
import { HotspotPanel } from './HotspotPanel'
import './DetailPanel.css'

export const DetailPanel: React.FC = () => {
  const { rightPanelTab, setRightPanelTab, selectedFile } = useAppStore()

  return (
    <div className="detail-panel">
      <div className="detail-tabs">
        <button
          className={`detail-tab ${rightPanelTab === 'details' ? 'active' : ''}`}
          onClick={() => setRightPanelTab('details')}
        >
          Details
        </button>
        <button
          className={`detail-tab ${rightPanelTab === 'blame' ? 'active' : ''}`}
          onClick={() => setRightPanelTab('blame')}
        >
          Blame
        </button>
        <button
          className={`detail-tab ${rightPanelTab === 'explain' ? 'active' : ''}`}
          onClick={() => setRightPanelTab('explain')}
        >
          Explain
        </button>
        <button
          className={`detail-tab ${rightPanelTab === 'hotspots' ? 'active' : ''}`}
          onClick={() => setRightPanelTab('hotspots')}
        >
          Hotspots
        </button>
      </div>
      
      <div className="detail-content">
        {rightPanelTab === 'details' && (
          <div className="detail-section">
            <h3>Commit Details</h3>
            {selectedFile ? (
              <div className="commit-info">
                <p className="placeholder-text">
                  Commit information will appear here when you click on a blame annotation or hunk.
                </p>
              </div>
            ) : (
              <p className="placeholder-text">Select a file to view details</p>
            )}
          </div>
        )}
        
        {rightPanelTab === 'blame' && (
          <div className="detail-section">
            <h3>Blame Information</h3>
            <p className="placeholder-text">
              Blame data will appear here. Enable blame view and click on a line.
            </p>
          </div>
        )}
        
        {rightPanelTab === 'explain' && (
          <div className="detail-section">
            <h3>AI Explanation</h3>
            <button className="btn-explain">
              Explain Selected Change
            </button>
            <div className="explanation-placeholder">
              <p className="placeholder-text">
                Select code and click "Explain" to get an AI-powered analysis.
              </p>
            </div>
          </div>
        )}
        
        {rightPanelTab === 'hotspots' && (
          <HotspotPanel />
        )}
      </div>
    </div>
  )
}
