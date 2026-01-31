import React from "react";
import "./CommitCard.css";

export interface CommitCardData {
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

interface CommitCardProps {
  commit: CommitCardData;
  label: string;
  variant?: "base" | "head" | "default";
  repoFullName?: string;
  linkIcon?: React.ReactNode;
  branchIcon?: React.ReactNode;
  prIcon?: React.ReactNode;
  userIcon?: React.ReactNode;
  calendarIcon?: React.ReactNode;
}

export const CommitCard: React.FC<CommitCardProps> = ({
  commit,
  label,
  variant = "default",
  repoFullName,
  linkIcon,
  branchIcon,
  prIcon,
  userIcon,
  calendarIcon,
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMessage = (message?: string) => {
    if (!message) return "";
    const firstLine = message.split("\n")[0];
    return firstLine.length > 80 ? `${firstLine.substring(0, 80)}...` : firstLine;
  };

  return (
    <div className={`commit-card commit-card-${variant}`}>
      <div className="commit-card-header">
        <div className="commit-card-label">{label}</div>
        {commit.url && (
          <a
            href={commit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="commit-card-external-link"
            title="View on GitHub"
          >
            {linkIcon}
          </a>
        )}
      </div>

      <div className="commit-card-sha">
        {branchIcon}
        <code>{commit.shortSha || commit.sha?.substring(0, 7)}</code>
        {commit.prNumber && repoFullName && (
          <a
            href={`https://github.com/${repoFullName}/pull/${commit.prNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="commit-card-pr-link"
            title={`View PR #${commit.prNumber}`}
          >
            {prIcon}
            <span>PR #{commit.prNumber}</span>
          </a>
        )}
      </div>

      <div className="commit-card-message">
        <div className="commit-message-full">{formatMessage(commit.message)}</div>
      </div>

      <div className="commit-card-meta">
        <div className="commit-meta-item">
          {userIcon}
          <span>{commit.author?.name || "Unknown"}</span>
        </div>
        <div className="commit-meta-item">
          {calendarIcon}
          <span>{formatDate(commit.author?.date)}</span>
        </div>
      </div>
    </div>
  );
};
