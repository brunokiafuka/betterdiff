// Type declarations for Electron IPC bridge
// This file ensures TypeScript knows about window.electronAPI

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
    }
  }
}
