import { create } from 'zustand'
import { Repo, GitRef, Comparison, FileChange, Commit } from '../types'

interface AppState {
  // Current repo and refs
  currentRepo: Repo | null
  baseRef: GitRef | null
  headRef: GitRef | null
  
  // Current comparison
  currentComparison: Comparison | null
  selectedFile: FileChange | null
  
  // UI state
  showBlame: boolean
  viewMode: 'side-by-side' | 'inline' | 'timeline'
  rightPanelTab: 'details' | 'blame' | 'explain'
  
  // Actions
  setRepo: (repo: Repo) => void
  setRefs: (base: GitRef, head: GitRef) => void
  setComparison: (comparison: Comparison) => void
  selectFile: (file: FileChange) => void
  toggleBlame: () => void
  setViewMode: (mode: 'side-by-side' | 'inline' | 'timeline') => void
  setRightPanelTab: (tab: 'details' | 'blame' | 'explain') => void
}

export const useAppStore = create<AppState>((set) => ({
  currentRepo: null,
  baseRef: null,
  headRef: null,
  currentComparison: null,
  selectedFile: null,
  showBlame: false,
  viewMode: 'side-by-side',
  rightPanelTab: 'details',
  
  setRepo: (repo) => set({ currentRepo: repo }),
  setRefs: (base, head) => set({ baseRef: base, headRef: head }),
  setComparison: (comparison) => set({ currentComparison: comparison }),
  selectFile: (file) => set({ selectedFile: file }),
  toggleBlame: () => set((state) => ({ showBlame: !state.showBlame })),
  setViewMode: (mode) => set({ viewMode: mode }),
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
}))
