import React, { useMemo } from "react";
import { MultiFileDiff, File } from "@pierre/diffs/react";
import type { FileContents } from "@pierre/diffs";
import "./FileDiffViewer.css";

export interface FileDiffViewerProps {
  filePath: string;
  baseSha: string | null;
  headSha: string | null;
  oldContent: string;
  newContent: string;
  loading?: boolean;
  onDetailsClick?: () => void;
  detailsLabel?: string;
  detailsIcon?: React.ReactNode;
}

export const FileDiffViewer: React.FC<FileDiffViewerProps> = ({
  filePath,
  baseSha,
  headSha,
  oldContent,
  newContent,
  loading = false,
  onDetailsClick,
  detailsLabel = "Details",
  detailsIcon,
}) => {
  // Create stable file objects for @pierre/diffs
  // The library uses reference equality to detect changes
  const oldFile: FileContents = useMemo(
    () => ({
      name: filePath,
      contents: oldContent,
    }),
    [filePath, oldContent]
  );

  const newFile: FileContents = useMemo(
    () => ({
      name: filePath,
      contents: newContent,
    }),
    [filePath, newContent]
  );

  if (!baseSha || !headSha) {
    return (
      <div className="file-diff-viewer">
        <div className="diff-empty">Select commits from the history below to view the file</div>
      </div>
    );
  }

  const isSameCommit = baseSha === headSha;
  const hasLabel = Boolean(detailsLabel);

  return (
    <div className="file-diff-viewer">
      <div className="diff-header">
        <div className="diff-file-path">{filePath}</div>
        {onDetailsClick && (
          <button
            className={`diff-details-btn ${hasLabel ? "with-label" : "icon-only"}`}
            onClick={onDetailsClick}
            title={detailsLabel || "Details"}
          >
            {detailsIcon}
            {hasLabel && <span>{detailsLabel}</span>}
          </button>
        )}
      </div>

      <div className="diff-editor-container">
        {loading ? (
          <div className="diff-loading">
            <div className="spinner"></div>
            <span>Loading file contents...</span>
          </div>
        ) : isSameCommit ? (
          <File
            file={newFile}
            options={{
              theme: "pierre-dark",
              disableFileHeader: true,
              overflow: "scroll",
            }}
            className="pierre-diff-file"
          />
        ) : (
          <MultiFileDiff
            oldFile={oldFile}
            newFile={newFile}
            options={{
              theme: "pierre-dark",
              diffStyle: "split",
              diffIndicators: "bars",
              hunkSeparators: "line-info",
              lineDiffType: "word-alt",
              disableFileHeader: true,
              overflow: "scroll",
            }}
            className="pierre-diff-viewer"
          />
        )}
      </div>
    </div>
  );
};
