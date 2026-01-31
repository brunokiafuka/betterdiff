import React from "react";
import "./FileTreePanel.css";

export interface FileTreeNode {
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}

interface FileTreePanelProps {
  tree: FileTreeNode[];
  expandedDirs: Set<string>;
  selectedFile: string | null;
  loading?: boolean;
  title?: string;
  emptyMessage?: string;
  renderDirectoryIcon?: (isExpanded: boolean) => React.ReactNode;
  fileIcon?: React.ReactNode;
  onToggleDirectory: (path: string) => void;
  onSelectFile: (path: string) => void;
}

export const FileTreePanel: React.FC<FileTreePanelProps> = ({
  tree,
  expandedDirs,
  selectedFile,
  loading = false,
  title = "Files",
  emptyMessage = "No files found",
  renderDirectoryIcon,
  fileIcon,
  onToggleDirectory,
  onSelectFile,
}) => {
  const renderTree = (nodes: FileTreeNode[], level: number = 0) => {
    return nodes.map((node) => {
      const fileName = node.path.split("/").pop() || node.path;
      const isExpanded = expandedDirs.has(node.path);
      const isSelected = selectedFile === node.path;

      return (
        <div key={node.path}>
          <div
            role="button"
            tabIndex={0}
            className={`tree-node ${isSelected ? "selected" : ""}`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => {
              if (node.type === "directory") {
                onToggleDirectory(node.path);
              } else {
                onSelectFile(node.path);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                if (node.type === "directory") {
                  onToggleDirectory(node.path);
                } else {
                  onSelectFile(node.path);
                }
              }
            }}
            aria-label={`${node.type === "directory" ? "Folder" : "File"}: ${fileName}`}
          >
            {node.type === "directory" ? (
              <>
                {renderDirectoryIcon ? (
                  <span className="tree-icon">{renderDirectoryIcon(isExpanded)}</span>
                ) : null}
                <span className="tree-name">{fileName}</span>
              </>
            ) : (
              <>
                {fileIcon ? <span className="tree-icon">{fileIcon}</span> : null}
                <span className="tree-name">{fileName}</span>
              </>
            )}
          </div>
          {node.type === "directory" && isExpanded && node.children && (
            <div className="tree-children">{renderTree(node.children, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="file-tree-panel">
      <div className="file-tree-header">
        <h3>{title}</h3>
      </div>

      <div className="file-tree-content">
        {loading ? (
          <div className="file-tree-loading">
            <div className="spinner"></div>
            <span>Loading files...</span>
          </div>
        ) : tree.length === 0 ? (
          <div className="file-tree-empty">
            <span>{emptyMessage}</span>
          </div>
        ) : (
          renderTree(tree)
        )}
      </div>
    </div>
  );
};
