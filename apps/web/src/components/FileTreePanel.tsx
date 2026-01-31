import { useState, useEffect } from 'react'
import { useSignals } from '@preact/signals-react/runtime'
import { Folder, FolderOpen, File } from 'lucide-react'
import { FileTreePanel as UiFileTreePanel } from '@whodidit/ui'
import { currentRepo, baseRef } from '../stores/appStore'
import { useGetRepoTree } from '../services/github'

interface FileNode {
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

interface FileTreePanelProps {
  initialSelectedFile?: string
}

export const FileTreePanel: React.FC<FileTreePanelProps> = ({ initialSelectedFile }) => {
  useSignals()
  const repo = currentRepo.value
  const ref = baseRef.value
  const getRepoTree = useGetRepoTree()
  const [treeData, setTreeData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [selectedFile, setSelectedFile] = useState<string | null>(initialSelectedFile || null)

  // Load tree data when repo or ref changes
  useEffect(() => {
    if (!repo?.fullName || !ref?.sha) {
      setTreeData([])
      setFileTree([])
      return
    }

    const loadTree = async () => {
      setLoading(true)
      try {
        const result = await getRepoTree({ repoFullName: repo.fullName, ref: ref.sha })
        setTreeData(result || [])
      } catch (err: any) {
        console.error('Failed to load repo tree:', err)
        setTreeData([])
      } finally {
        setLoading(false)
      }
    }

    loadTree()
  }, [repo?.fullName, ref?.sha, getRepoTree])

  useEffect(() => {
    if (!treeData || treeData.length === 0) {
      setFileTree([])
      return
    }

    const buildTreeStructure = (files: any[]): FileNode[] => {
      const root: FileNode[] = []
      const dirMap = new Map<string, FileNode>()

      files.forEach((file: any) => {
        const parts = file.path.split('/')
        let currentLevel = root

        parts.forEach((_: string, index: number) => {
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

    setFileTree(buildTreeStructure(treeData))
  }, [treeData])

  // Expand parent directories and select file when initialized from URL
  useEffect(() => {
    if (initialSelectedFile && fileTree.length > 0) {
      // Expand all parent directories
      const parts = initialSelectedFile.split('/')
      const newExpanded = new Set(expandedDirs)

      for (let i = 1; i < parts.length; i++) {
        const parentPath = parts.slice(0, i).join('/')
        newExpanded.add(parentPath)
      }

      setExpandedDirs(newExpanded)
      setSelectedFile(initialSelectedFile)

      // Dispatch event to notify parent
      window.dispatchEvent(new CustomEvent('file-selected', { detail: { path: initialSelectedFile } }))
    }
  }, [initialSelectedFile, fileTree.length]) // Only when fileTree is loaded

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

  if (!repo || !ref) {
    return (
      <UiFileTreePanel
        tree={[]}
        expandedDirs={expandedDirs}
        selectedFile={selectedFile}
        loading={false}
        emptyMessage="Select a repository and branch to browse files"
        onToggleDirectory={toggleDirectory}
        onSelectFile={handleFileClick}
        renderDirectoryIcon={(isExpanded) =>
          isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />
        }
        fileIcon={<File size={16} />}
      />
    )
  }

  return (
    <UiFileTreePanel
      tree={fileTree}
      expandedDirs={expandedDirs}
      selectedFile={selectedFile}
      loading={loading}
      onToggleDirectory={toggleDirectory}
      onSelectFile={handleFileClick}
      renderDirectoryIcon={(isExpanded) =>
        isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />
      }
      fileIcon={<File size={16} />}
    />
  )
}
