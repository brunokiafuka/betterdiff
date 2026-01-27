import { useState, useEffect } from 'react'
import { currentRepo } from '../stores/appStore'
import { useAnalyzeHotspots } from '../services/github'
import type { HotspotAnalysis, HotspotFile } from '../types'
import './HotspotPanel.css'

export const HotspotPanel: React.FC = () => {
  const analyzeHotspots = useAnalyzeHotspots()
  const repo = currentRepo.value
  const [analysis, setAnalysis] = useState<HotspotAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeWindow, setTimeWindow] = useState(30)
  const [sortBy, setSortBy] = useState<'score' | 'changes' | 'churn'>('score')

  useEffect(() => {
    setAnalysis(null)
    setError(null)
    
    if (repo && repo.type === 'github') {
      loadHotspots()
    }
  }, [repo, timeWindow])

  const loadHotspots = async () => {
    if (!repo || repo.type !== 'github') return

    setLoading(true)
    setError(null)
    try {
      const result = await analyzeHotspots({
        repoFullName: repo.fullName,
        ref: repo.defaultBranch || 'main',
        timeWindow,
      })
      setAnalysis(result)
    } catch (err: any) {
      setError(err.message || 'Failed to load hotspots')
      console.error('Failed to load hotspots:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileClick = (filePath: string) => {
    window.dispatchEvent(new CustomEvent('file-selected', { detail: { path: filePath } }))
  }

  const getScoreColor = (score: number): string => {
    if (score >= 70) return '#ff4444' // High - red
    if (score >= 50) return '#ff8800' // Medium-high - orange
    if (score >= 30) return '#ffbb00' // Medium - yellow
    return '#888' // Low - gray
  }

  const sortedFiles = analysis?.files ? [...analysis.files].sort((a, b) => {
    switch (sortBy) {
      case 'changes':
        return b.changeCount - a.changeCount
      case 'churn':
        return b.churn - a.churn
      case 'score':
      default:
        return b.hotspotScore - a.hotspotScore
    }
  }) : []

  if (!repo || repo.type !== 'github') {
    return (
      <div className="hotspot-panel">
        <p className="placeholder-text">Please select a repository to analyze hotspots</p>
      </div>
    )
  }

  return (
    <div className="hotspot-panel">
      <div className="hotspot-controls">
        <div className="hotspot-time-window">
          <label>Time Window:</label>
          <select
            value={timeWindow}
            onChange={(e) => setTimeWindow(Number(e.target.value))}
            className="hotspot-select"
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={365}>1 year</option>
          </select>
        </div>
        <div className="hotspot-sort">
          <label>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'score' | 'changes' | 'churn')}
            className="hotspot-select"
          >
            <option value="score">Hotspot Score</option>
            <option value="changes">Change Count</option>
            <option value="churn">Churn (lines)</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="hotspot-loading">
          <p className="placeholder-text">Analyzing repository...</p>
        </div>
      )}

      {error && (
        <div className="hotspot-error">
          <p className="error-text">{error}</p>
          <button onClick={loadHotspots} className="btn-retry">Retry</button>
        </div>
      )}

      {!loading && !error && analysis && (
        <>
          <div className="hotspot-summary">
            <p className="summary-text">
              Found <strong>{analysis.files.length}</strong> files with changes in the last{' '}
              <strong>{timeWindow}</strong> days
            </p>
          </div>

          {sortedFiles.length === 0 ? (
            <p className="placeholder-text">No hotspots found</p>
          ) : (
            <div className="hotspot-list">
              {sortedFiles.map((file) => (
                <div
                  key={file.path}
                  className="hotspot-item"
                  onClick={() => handleFileClick(file.path)}
                >
                  <div className="hotspot-item-header">
                    <span className="hotspot-path">{file.path}</span>
                    <span
                      className="hotspot-score"
                      style={{ color: getScoreColor(file.hotspotScore) }}
                    >
                      {file.hotspotScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="hotspot-item-stats">
                    <span className="stat">
                      <strong>{file.changeCount}</strong> changes
                    </span>
                    <span className="stat">
                      <strong>{file.churn}</strong> lines
                    </span>
                    <span className="stat">
                      <strong>{file.authorCount}</strong> authors
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
