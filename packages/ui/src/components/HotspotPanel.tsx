import React from "react";
import "./HotspotPanel.css";

export interface HotspotFile {
  path: string;
  hotspotScore: number;
  changeCount: number;
  churn: number;
  authorCount: number;
}

export interface HotspotAnalysis {
  files: HotspotFile[];
  timeWindow: number;
}

interface HotspotPanelProps {
  analysis: HotspotAnalysis | null;
  loading: boolean;
  error: string | null;
  timeWindow: number;
  sortBy: "score" | "changes" | "churn";
  onTimeWindowChange: (value: number) => void;
  onSortByChange: (value: "score" | "changes" | "churn") => void;
  onFileClick: (filePath: string) => void;
  onRetry: () => void;
  emptyMessage?: string;
  noRepoMessage?: string;
  showPanel?: boolean;
}

export const HotspotPanel: React.FC<HotspotPanelProps> = ({
  analysis,
  loading,
  error,
  timeWindow,
  sortBy,
  onTimeWindowChange,
  onSortByChange,
  onFileClick,
  onRetry,
  emptyMessage = "Please select a repository to analyze hotspots",
  noRepoMessage = "Please select a repository to analyze hotspots",
  showPanel = true,
}) => {
  const getScoreColor = (score: number): string => {
    if (score >= 70) return "#ff4444"; // High - red
    if (score >= 50) return "#ff8800"; // Medium-high - orange
    if (score >= 30) return "#ffbb00"; // Medium - yellow
    return "#888"; // Low - gray
  };

  const sortedFiles = analysis?.files
    ? [...analysis.files].sort((a, b) => {
        switch (sortBy) {
          case "changes":
            return b.changeCount - a.changeCount;
          case "churn":
            return b.churn - a.churn;
          case "score":
          default:
            return b.hotspotScore - a.hotspotScore;
        }
      })
    : [];

  if (!showPanel) {
    return (
      <div className="hotspot-panel">
        <p className="placeholder-text">{noRepoMessage}</p>
      </div>
    );
  }

  return (
    <div className="hotspot-panel">
      <div className="hotspot-controls">
        <div className="hotspot-time-window">
          <label>Time Window:</label>
          <select
            value={timeWindow}
            onChange={(e) => onTimeWindowChange(Number(e.target.value))}
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
            onChange={(e) =>
              onSortByChange(e.target.value as "score" | "changes" | "churn")
            }
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
          <button onClick={onRetry} className="btn-retry">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && analysis && (
        <>
          <div className="hotspot-summary">
            <p className="summary-text">
              Found <strong>{analysis.files.length}</strong> files with changes
              in the last <strong>{timeWindow}</strong> days
            </p>
          </div>

          {sortedFiles.length === 0 ? (
            <p className="placeholder-text">{emptyMessage}</p>
          ) : (
            <div className="hotspot-list">
              {sortedFiles.map((file) => (
                <div
                  key={file.path}
                  className="hotspot-item"
                  onClick={() => onFileClick(file.path)}
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
  );
};
