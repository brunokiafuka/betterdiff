import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // GitHub API
  github: {
    auth: (token: string) => ipcRenderer.invoke('github:auth', token),
    fetchRepos: () => ipcRenderer.invoke('github:fetchRepos'),
    compareRefs: (repo: string, base: string, head: string) => 
      ipcRenderer.invoke('github:compareRefs', repo, base, head),
    getFileContent: (repo: string, ref: string, path: string) =>
      ipcRenderer.invoke('github:getFileContent', repo, ref, path),
    listBranches: (repo: string) =>
      ipcRenderer.invoke('github:listBranches', repo),
    getRepoTree: (repo: string, ref: string) =>
      ipcRenderer.invoke('github:getRepoTree', repo, ref),
    getFileHistory: (repo: string, path: string, ref: string) =>
      ipcRenderer.invoke('github:getFileHistory', repo, path, ref),
    getCommit: (repo: string, sha: string) =>
      ipcRenderer.invoke('github:getCommit', repo, sha),
    getBlame: (repo: string, ref: string, path: string) =>
      ipcRenderer.invoke('github:getBlame', repo, ref, path),
  },
  
  // LLM
  llm: {
    explain: (context: any) => ipcRenderer.invoke('llm:explain', context),
  },
  
  // Config
  config: {
    read: () => ipcRenderer.invoke('config:read'),
    write: (config: any) => ipcRenderer.invoke('config:write', config),
    exists: () => ipcRenderer.invoke('config:exists'),
  },
  
  // Local repositories
  local: {
    selectFolder: () => ipcRenderer.invoke('local:selectFolder'),
    getStatus: (repoPath: string) => ipcRenderer.invoke('local:getStatus', repoPath),
    stashChanges: (repoPath: string, message?: string) => ipcRenderer.invoke('local:stashChanges', repoPath, message),
    checkoutBranch: (repoPath: string, branchName: string, force?: boolean) => ipcRenderer.invoke('local:checkoutBranch', repoPath, branchName, force),
    listBranches: (repoPath: string) => ipcRenderer.invoke('local:listBranches', repoPath),
    compareRefs: (repoPath: string, base: string, head: string) =>
      ipcRenderer.invoke('local:compareRefs', repoPath, base, head),
    getFileContent: (repoPath: string, ref: string, path: string) =>
      ipcRenderer.invoke('local:getFileContent', repoPath, ref, path),
    getRepoTree: (repoPath: string, ref: string) =>
      ipcRenderer.invoke('local:getRepoTree', repoPath, ref),
    getFileHistory: (repoPath: string, path: string, ref: string) =>
      ipcRenderer.invoke('local:getFileHistory', repoPath, path, ref),
    getCommit: (repoPath: string, sha: string) =>
      ipcRenderer.invoke('local:getCommit', repoPath, sha),
    getBlame: (repoPath: string, ref: string, path: string) =>
      ipcRenderer.invoke('local:getBlame', repoPath, ref, path),
    worktreeList: (repoPath: string) => ipcRenderer.invoke('local:worktree:list', repoPath),
    worktreeAdd: (repoPath: string, options: any) =>
      ipcRenderer.invoke('local:worktree:add', repoPath, options),
    worktreeRemove: (repoPath: string, worktreePath: string, force?: boolean) =>
      ipcRenderer.invoke('local:worktree:remove', repoPath, worktreePath, force),
    worktreeMove: (repoPath: string, worktreePath: string, newPath: string, force?: boolean) =>
      ipcRenderer.invoke('local:worktree:move', repoPath, worktreePath, newPath, force),
    worktreePrune: (repoPath: string, dryRun?: boolean) =>
      ipcRenderer.invoke('local:worktree:prune', repoPath, dryRun),
    worktreeLock: (repoPath: string, worktreePath: string, reason?: string) =>
      ipcRenderer.invoke('local:worktree:lock', repoPath, worktreePath, reason),
    worktreeUnlock: (repoPath: string, worktreePath: string) =>
      ipcRenderer.invoke('local:worktree:unlock', repoPath, worktreePath),
  },
  
  // Hotspot detection
  hotspot: {
    analyze: (repo: string, ref: string, timeWindow?: number) =>
      ipcRenderer.invoke('hotspot:analyze', repo, ref, timeWindow),
  },
  
  // Local hotspot detection
  localHotspot: {
    analyze: (repoPath: string, ref: string, timeWindow?: number) =>
      ipcRenderer.invoke('local:hotspot:analyze', repoPath, ref, timeWindow),
  },
  
  // Menu events
  onMenuAction: (action: string, callback: () => void) => {
    ipcRenderer.on(`menu:${action}`, callback)
    return () => ipcRenderer.removeListener(`menu:${action}`, callback)
  }
})

// Type declarations for TypeScript
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
      }
      hotspot: {
        analyze: (repo: string, ref: string, timeWindow?: number) => Promise<any>
      }
      localHotspot: {
        analyze: (repoPath: string, ref: string, timeWindow?: number) => Promise<any>
      }
      onMenuAction: (action: string, callback: () => void) => () => void
    }
  }
}
