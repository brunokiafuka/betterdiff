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
    }
  }
}
