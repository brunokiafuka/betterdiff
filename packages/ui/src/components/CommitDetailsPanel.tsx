import React from "react";
import { CommitCard } from "./CommitCard";
import type { CommitCardData } from "./CommitCard";
import "./CommitDetailsPanel.css";

export interface CommitDetails {
  sha?: string;
  shortSha?: string;
  message?: string;
  url?: string;
  prNumber?: number;
  author?: {
    name?: string;
    date?: string;
  };
}

interface CommitDetailsPanelProps {
  repoFullName: string;
  baseSha: string | null;
  headSha: string | null;
  baseCommit?: CommitDetails | null;
  headCommit?: CommitDetails | null;
  loading?: boolean;
  error?: string | null;
  showHeader?: boolean;
  title?: string;
  onClose?: () => void;
  closeIcon?: React.ReactNode;
  linkIcon?: React.ReactNode;
  branchIcon?: React.ReactNode;
  prIcon?: React.ReactNode;
  userIcon?: React.ReactNode;
  calendarIcon?: React.ReactNode;
}

export const CommitDetailsPanel: React.FC<CommitDetailsPanelProps> = ({
  repoFullName,
  baseSha,
  headSha,
  baseCommit,
  headCommit,
  loading = false,
  error = null,
  showHeader = false,
  title = "Commit Details",
  onClose,
  closeIcon,
  linkIcon,
  branchIcon,
  prIcon,
  userIcon,
  calendarIcon,
}) => {
  const renderCommit = (commit: CommitDetails | null | undefined, label: string, isBase = false) => {
    if (!commit) return null;

    return (
      <CommitCard
        commit={commit as CommitCardData}
        label={label}
        variant={isBase ? "base" : "head"}
        repoFullName={repoFullName}
        linkIcon={linkIcon}
        branchIcon={branchIcon}
        prIcon={prIcon}
        userIcon={userIcon}
        calendarIcon={calendarIcon}
      />
    );
  };

  const isSameCommit = baseSha && headSha && baseSha === headSha;

  return (
    <div className="commit-details-panel">
      {showHeader && (
        <div className="commit-details-header">
          <h3>{title}</h3>
          {onClose && (
            <button className="commit-details-close" onClick={onClose} title="Close">
              {closeIcon}
            </button>
          )}
        </div>
      )}

      <div className="commit-details-content">
        {loading ? (
          <div className="commit-details-loading">
            <div className="spinner"></div>
            <span>Loading commit details...</span>
          </div>
        ) : (
          <>
            {error && (
              <div className="commit-details-error">
                <p>
                  <strong>Error:</strong> {error}
                </p>
              </div>
            )}

            {isSameCommit ? (
              headCommit || baseCommit ? (
                renderCommit(headCommit || baseCommit, "Commit", false)
              ) : !error ? (
                <div className="commit-details-empty">
                  <p>Failed to load commit</p>
                </div>
              ) : null
            ) : (
              <>
                {baseSha && baseCommit ? (
                  renderCommit(baseCommit, "Base Commit", true)
                ) : baseSha && !loading && !error ? (
                  <div className="commit-details-empty">
                    <p>Failed to load base commit</p>
                  </div>
                ) : null}

                {headSha && headCommit ? (
                  renderCommit(headCommit, "Head Commit", false)
                ) : headSha && !loading && !error ? (
                  <div className="commit-details-empty">
                    <p>Failed to load head commit</p>
                  </div>
                ) : null}
              </>
            )}

            {!baseSha && !headSha && (
              <div className="commit-details-empty">
                <p>No commits selected</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
