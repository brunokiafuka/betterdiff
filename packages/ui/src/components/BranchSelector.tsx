import React from "react";
import "./BranchSelector.css";

export interface BranchItem {
  name: string;
  isCurrent?: boolean;
}

export interface BranchSelectorConflict {
  branchName: string;
  onStash: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  loading?: boolean;
  warningIcon?: React.ReactNode;
  stashIcon?: React.ReactNode;
  discardIcon?: React.ReactNode;
}

interface BranchSelectorProps {
  triggerLabel: string;
  triggerDisabled?: boolean;
  isOpen: boolean;
  loading?: boolean;
  branches: BranchItem[];
  error?: string | null;
  onToggleOpen: () => void;
  onClose: () => void;
  onSelectBranch: (branch: BranchItem) => void;
  onDismissError?: () => void;
  conflict?: BranchSelectorConflict;
  triggerIcon?: React.ReactNode;
  chevronIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
  branchIcon?: React.ReactNode;
}

export const BranchSelector: React.FC<BranchSelectorProps> = ({
  triggerLabel,
  triggerDisabled = false,
  isOpen,
  loading = false,
  branches,
  error,
  onToggleOpen,
  onClose,
  onSelectBranch,
  onDismissError,
  conflict,
  triggerIcon,
  chevronIcon,
  closeIcon,
  branchIcon,
}) => {
  return (
    <div className="branch-selector">
      <button
        className="branch-selector-btn"
        onClick={onToggleOpen}
        title="Switch branch"
        disabled={triggerDisabled}
      >
        {triggerIcon}
        <span className="branch-name">{triggerLabel}</span>
        {chevronIcon}
      </button>

      {isOpen && (
        <div className="branch-dropdown">
          <div className="branch-dropdown-header">
            <span>Select branch</span>
            <button className="branch-dropdown-close" onClick={onClose} title="Close">
              {closeIcon}
            </button>
          </div>
          <div className="branch-dropdown-content">
            {conflict ? (
              <div className="branch-conflict-warning">
                <div className="conflict-header">
                  {conflict.warningIcon}
                  <span>Uncommitted changes detected</span>
                </div>
                <p className="conflict-message">
                  You have uncommitted changes that would be overwritten by switching to{" "}
                  <strong>{conflict.branchName}</strong>.
                </p>
                <div className="conflict-actions">
                  <button
                    className="conflict-btn stash-btn"
                    onClick={conflict.onStash}
                    disabled={conflict.loading}
                  >
                    {conflict.stashIcon}
                    <span>Stash & Switch</span>
                  </button>
                  <button
                    className="conflict-btn discard-btn"
                    onClick={conflict.onDiscard}
                    disabled={conflict.loading}
                  >
                    {conflict.discardIcon}
                    <span>Discard & Switch</span>
                  </button>
                  <button
                    className="conflict-btn cancel-btn"
                    onClick={conflict.onCancel}
                    disabled={conflict.loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : loading ? (
              <div className="branch-loading">
                <div className="spinner"></div>
                <span>Loading branches...</span>
              </div>
            ) : error ? (
              <div className="branch-error">
                <span>{error}</span>
                {onDismissError && (
                  <button className="error-dismiss" onClick={onDismissError}>
                    Dismiss
                  </button>
                )}
              </div>
            ) : branches.length === 0 ? (
              <div className="branch-empty">
                <span>No branches found</span>
              </div>
            ) : (
              branches.map((branch) => {
                const isCurrent = branch.isCurrent;
                return (
                  <button
                    key={branch.name}
                    className={`branch-item ${isCurrent ? "current" : ""}`}
                    onClick={() => onSelectBranch(branch)}
                    disabled={isCurrent || loading}
                  >
                    {branchIcon}
                    <span className="branch-item-name">{branch.name}</span>
                    {isCurrent && <span className="branch-item-badge">Current</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
