import { useState, useEffect } from 'react'
import { Folder, FolderOpen, File } from 'lucide-react'
import { FileTreePanel as UiFileTreePanel } from '@whodidit/ui'
import { useAppStore } from '../stores/appStore'

interface FileNode {
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

export const FileTreePanel: React.FC = () => {
  const { currentRepo, baseRef } = useAppStore()
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentRepo || !baseRef) return

    const loadFileTree = async () => {
      setLoading(true)
      try {
        const tree = currentRepo.type === 'local'
          ? await window.electronAPI.local.getRepoTree(currentRepo.localPath!, baseRef.name)
          : await window.electronAPI.github.getRepoTree(currentRepo.fullName, baseRef.sha)
        setFileTree(buildTreeStructure(tree))
      } catch (error) {
        console.error('Failed to load file tree:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFileTree()
  }, [currentRepo, baseRef])

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

  if (!currentRepo || !baseRef) {
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
