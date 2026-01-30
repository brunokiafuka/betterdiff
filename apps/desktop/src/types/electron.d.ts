// Type declarations for Electron IPC bridge
// This file ensures TypeScript knows about window.electronAPI

import type { WorktreeAddOptions, WorktreeInfo } from './index'

export {}

declare global {
  interface Window {
    electronAPI: {
      github: {
        auth: (token: string) => Promise<{ success: boolean; user?: string; error?: string }>
        fetchRepos: () => Promise<any[]>
        compareRefs: (repo: string, base: string, head: string) => Promise<any>
        getFileContent: (repo: string, ref: string, path: string) => Promise<string>
        listBranches: (repo: string) => Promise<any[]>
        getRepoTree: (repo: string, ref: string) => Promise<any[]>
        getFileHistory: (repo: string, path: string, ref: string) => Promise<any[]>
        getCommit: (repo: string, sha: string) => Promise<any>
        getBlame: (repo: string, ref: string, path: string) => Promise<any[]>
      }
      llm: {
        explain: (context: any) => Promise<any>
      }
      config: {
        read: () => Promise<any>
        write: (config: any) => Promise<{ success: boolean }>
        exists: () => Promise<boolean>
      }
      local: {
        selectFolder: () => Promise<any>
        getRepoInfo: (repoPath: string) => Promise<any>
        selectFolderPath: () => Promise<string | null>
        pathExists: (targetPath: string) => Promise<boolean>
        removeFolder: (targetPath: string) => Promise<{ success: boolean }>
        getStatus: (repoPath: string) => Promise<any>
        stashChanges: (repoPath: string, message?: string) => Promise<any>
        checkoutBranch: (repoPath: string, branchName: string, force?: boolean) => Promise<any>
        listBranches: (repoPath: string) => Promise<any[]>
        compareRefs: (repoPath: string, base: string, head: string) => Promise<any>
        getFileContent: (repoPath: string, ref: string, path: string) => Promise<string>
        getRepoTree: (repoPath: string, ref: string) => Promise<any[]>
        getFileHistory: (repoPath: string, path: string, ref: string) => Promise<any[]>
        getCommit: (repoPath: string, sha: string) => Promise<any>
        getBlame: (repoPath: string, ref: string, path: string) => Promise<any[]>
        worktreeList: (repoPath: string) => Promise<WorktreeInfo[]>
        worktreeAdd: (repoPath: string, options: WorktreeAddOptions) => Promise<{ success: boolean }>
        worktreeRemove: (repoPath: string, worktreePath: string, force?: boolean) => Promise<{ success: boolean }>
        worktreeMove: (repoPath: string, worktreePath: string, newPath: string, force?: boolean) => Promise<{ success: boolean }>
        worktreePrune: (repoPath: string, dryRun?: boolean) => Promise<{ success: boolean }>
        worktreeLock: (repoPath: string, worktreePath: string, reason?: string) => Promise<{ success: boolean }>
        worktreeUnlock: (repoPath: string, worktreePath: string) => Promise<{ success: boolean }>
      }
      hotspot: {
        analyze: (repo: string, ref: string, timeWindow?: number) => Promise<any>
      }
      localHotspot: {
        analyze: (repoPath: string, ref: string, timeWindow?: number) => Promise<any>
      }
      onMenuAction: (action: string, callback: () => void) => () => void
      app: {
        openRepoInNewWindow: (repoPath: string) => Promise<{ success: boolean }>
        onAppAction: (action: string, callback: (payload: any) => void) => () => void
      }
    }
  }
}
