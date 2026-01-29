import { useState, useEffect } from 'react'
import { Folder, FolderOpen, File } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useUiStore } from '../stores/uiStore'
import './FileTreePanel.css'

interface FileNode {
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

export const FileTreePanel: React.FC = () => {
  const { currentRepo, baseRef } = useAppStore()
  const { startAction, finishAction, failAction, addToast } = useUiStore()
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentRepo || !baseRef) return

    const loadFileTree = async () => {
      setLoading(true)
      startAction('loadFileTree', 'Loading file tree...')
      try {
        const tree = currentRepo.type === 'local'
          ? await window.electronAPI.local.getRepoTree(currentRepo.localPath!, baseRef.name)
          : await window.electronAPI.github.getRepoTree(currentRepo.fullName, baseRef.sha)
        setFileTree(buildTreeStructure(tree))
      } catch (error) {
        console.error('Failed to load file tree:', error)
        failAction('loadFileTree', 'Failed to load file tree')
        addToast('error', 'Failed to load file tree')
      } finally {
        setLoading(false)
        finishAction('loadFileTree')
      }
    }

    loadFileTree()
  }, [currentRepo, baseRef, startAction, finishAction, failAction, addToast])

  const buildTreeStructure = (files: any[]): FileNode[] => {
    const root: FileNode[] = []
    const dirMap = new Map<string, FileNode>()

    files.forEach((file: any) => {
      const parts = file.path.split('/')
      let currentLevel = root

      parts.forEach((part: string, index: number) => {
        const isFile = index === parts.length - 1 && file.type === 'blob'
        const fullPath = parts.slice(0, index + 1).join('/')

        let existing = currentLevel.find(n => n.path === fullPath)

        if (!existing) {
          existing = {
            path: fullPath,
            type: isFile ? 'file' : 'directory',
            children: isFile ? undefined : []
          }
          currentLevel.push(existing)
          if (!isFile) {
            dirMap.set(fullPath, existing)
          }
        }

        if (!isFile && existing.children) {
          currentLevel = existing.children
        }
      })
    })

    return sortTree(root)
  }

  const sortTree = (nodes: FileNode[]): FileNode[] => {
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1
      }
      return a.path.localeCompare(b.path)
    })
  }

  const toggleDirectory = (path: string) => {
    const newExpanded = new Set(expandedDirs)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedDirs(newExpanded)
  }

  const handleFileClick = (path: string) => {
    setSelectedFile(path)
    // Notify parent component about file selection
    window.dispatchEvent(new CustomEvent('file-selected', { detail: { path } }))
  }

  const renderTree = (nodes: FileNode[], level: number = 0): JSX.Element[] => {
    return nodes.map((node) => {
      const fileName = node.path.split('/').pop() || node.path
      const isExpanded = expandedDirs.has(node.path)
      const isSelected = selectedFile === node.path

      return (
        <div key={node.path}>
          <div
            className={`tree-node ${isSelected ? 'selected' : ''}`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => {
              if (node.type === 'directory') {
                toggleDirectory(node.path)
              } else {
                handleFileClick(node.path)
              }
            }}
          >
            {node.type === 'directory' ? (
              <>
                {isExpanded ? (
                  <FolderOpen size={16} className="tree-icon" />
                ) : (
                  <Folder size={16} className="tree-icon" />
                )}
                <span className="tree-name">{fileName}</span>
              </>
            ) : (
              <>
                <File size={16} className="tree-icon" />
                <span className="tree-name">{fileName}</span>
              </>
            )}
          </div>
          {node.type === 'directory' && isExpanded && node.children && (
            <div className="tree-children">
              {renderTree(node.children, level + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  if (!currentRepo || !baseRef) {
    return (
      <div className="file-tree-panel">
        <div className="file-tree-empty">
          Select a repository and branch to browse files
        </div>
      </div>
    )
  }

  return (
    <div className="file-tree-panel">
      <div className="file-tree-header">
        <h3>Files</h3>
      </div>

      {loading ? (
        <div className="file-tree-loading">
          <div className="spinner"></div>
          <span>Loading files...</span>
        </div>
      ) : (
        <div className="file-tree-content">
          {renderTree(fileTree)}
        </div>
      )}
    </div>
  )
}
