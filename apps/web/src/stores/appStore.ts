import { signal,  } from '@preact/signals-react'
import type { Repo, GitRef, Comparison, FileChange } from '../types'

// State signals
export const currentRepo = signal<Repo | null>(null)
export const baseRef = signal<GitRef | null>(null)
export const headRef = signal<GitRef | null>(null)
export const currentComparison = signal<Comparison | null>(null)
export const selectedFile = signal<FileChange | null>(null)
export const showBlame = signal<boolean>(false)
export const viewMode = signal<'side-by-side' | 'inline' | 'timeline'>('side-by-side')
export const rightPanelTab = signal<'details' | 'blame' | 'explain' | 'hotspots'>('details')

// Actions
export const setRepo = (repo: Repo) => {
  currentRepo.value = repo
  // Clear related state when repo changes
  currentComparison.value = null
  selectedFile.value = null
  baseRef.value = null
  headRef.value = null
}

export const setRefs = (base: GitRef, head: GitRef) => {
  baseRef.value = base
  headRef.value = head
}

export const setComparison = (comparison: Comparison) => {
  currentComparison.value = comparison
}

export const selectFile = (file: FileChange) => {
  selectedFile.value = file
}

export const toggleBlame = () => {
  showBlame.value = !showBlame.value
}

export const setViewMode = (mode: 'side-by-side' | 'inline' | 'timeline') => {
  viewMode.value = mode
}

export const setRightPanelTab = (tab: 'details' | 'blame' | 'explain' | 'hotspots') => {
  rightPanelTab.value = tab
}
