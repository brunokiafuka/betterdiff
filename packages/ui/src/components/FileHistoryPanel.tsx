import React from "react";
import "./FileHistoryPanel.css";

export interface CommitInfo {
  sha: string;
  shortSha: string;
  author: {
    name: string;
    email?: string;
    date: string;
  };
  message: string;
  prNumber?: number;
}

interface FileHistoryPanelProps {
  commits: CommitInfo[];
  selectedCommits: [string | null, string | null];
  loading?: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpen?: () => void;
  onSelectBase: (sha: string) => void;
  onSelectHead: (sha: string) => void;
}

export const FileHistoryPanel: React.FC<FileHistoryPanelProps> = ({
  commits,
  selectedCommits,
  loading = false,
  isCollapsed,
  onToggleCollapse,
  onOpen,
  onSelectBase,
  onSelectHead,
}) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  if (loading) {
    return (
      <div className="file-history-panel">
        <div className="file-history-loading">
          <div className="spinner"></div>
          <span>Loading commit history...</span>
        </div>
      </div>
    );
  }

  const isSameCommit = selectedCommits[0] === selectedCommits[1];

  return (
    <div className={`file-history-panel ${isCollapsed ? "collapsed" : ""}`}>
      <div
        className="file-history-header"
        onClick={() => {
          if (isCollapsed) {
            onOpen?.();
          }
          onToggleCollapse();
        }}
      >
        <div className="header-left">
          <span className={`collapse-icon ${isCollapsed ? "" : "expanded"}`}>▶</span>
          <h3>History</h3>
          <span className="file-history-count">{commits.length} commits</span>
        </div>
        <div className="header-right">
          {selectedCommits[0] && (
            <span className={`selected-commits-badge ${isSameCommit ? "single" : "diff"}`}>
              {isSameCommit
                ? `@ ${selectedCommits[0]?.substring(0, 7)}`
                : `${selectedCommits[0]?.substring(0, 7)} → ${selectedCommits[1]?.substring(0, 7)}`}
            </span>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="file-history-columns">
          <div className="history-column old-commits">
            <div className="column-header">
              <span className="column-label">Old Commit</span>
            </div>
            <div className="commits-scroll">
              {commits.map((commit) => {
                const isBase = selectedCommits[0] === commit.sha;
                return (
                  <div
                    key={commit.sha}
                    className={`commit-item compact ${isBase ? "selected base" : ""}`}
                    onClick={() => onSelectBase(commit.sha)}
                  >
                    <div className="commit-header">
                      <span className="commit-date">{formatDate(commit.author.date)}</span>
                      <span className="commit-sha">{commit.shortSha}</span>
                    </div>
                    <div className="commit-author">{commit.author.name}</div>
                    {isBase && <div className="commit-badge">BASE</div>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="column-divider"></div>

          <div className="history-column new-commits">
            <div className="column-header">
              <span className="column-label">New Commit</span>
            </div>
            <div className="commits-scroll">
              {commits.map((commit) => {
                const isHead = selectedCommits[1] === commit.sha;
                return (
                  <div
                    key={commit.sha}
                    className={`commit-item compact ${isHead ? "selected head" : ""}`}
                    onClick={() => onSelectHead(commit.sha)}
                  >
                    <div className="commit-header">
                      <span className="commit-date">{formatDate(commit.author.date)}</span>
                      <span className="commit-sha">{commit.shortSha}</span>
                    </div>
                    <div className="commit-author">{commit.author.name}</div>
                    {isHead && <div className="commit-badge">COMPARE</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
