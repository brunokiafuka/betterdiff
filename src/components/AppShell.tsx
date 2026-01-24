import React from 'react'
import { useAppStore } from '../stores/appStore'
import './AppShell.css'

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentRepo, baseRef, headRef, showBlame, toggleBlame } = useAppStore()

  return (
    <div className="app-shell">
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="repo-selector">
            {currentRepo ? (
              <span className="repo-name">{currentRepo.fullName}</span>
            ) : (
              <button className="btn-select-repo">Select Repository</button>
            )}
          </div>
          
          <div className="ref-selectors">
            <div className="ref-selector">
              <label>Base:</label>
              <select value={baseRef?.name || ''}>
                <option value="">Select base ref...</option>
                {baseRef && <option value={baseRef.name}>{baseRef.name}</option>}
              </select>
            </div>
            
            <span className="ref-arrow">→</span>
            
            <div className="ref-selector">
              <label>Compare:</label>
              <select value={headRef?.name || ''}>
                <option value="">Select compare ref...</option>
                {headRef && <option value={headRef.name}>{headRef.name}</option>}
              </select>
            </div>
          </div>
        </div>
        
        <div className="top-bar-right">
          <button 
            className={`btn-action ${showBlame ? 'active' : ''}`}
            onClick={toggleBlame}
            title="Toggle Blame (⌘⇧B)"
          >
            Blame
          </button>
          <button className="btn-action" title="Explain (⌘E)">
            Explain
          </button>
          <button className="btn-action">
            Settings
          </button>
        </div>
      </div>
      
      <div className="app-content">
        {children}
      </div>
    </div>
  )
}
