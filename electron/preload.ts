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
    getBlame: (repo: string, ref: string, path: string) =>
      ipcRenderer.invoke('github:getBlame', repo, ref, path),
  },
  
  // LLM
  llm: {
    explain: (context: any) => ipcRenderer.invoke('llm:explain', context),
  }
})

// Type declarations for TypeScript
declare global {
  interface Window {
    electronAPI: {
      github: {
        auth: (token: string) => Promise<{ success: boolean }>
        fetchRepos: () => Promise<any[]>
        compareRefs: (repo: string, base: string, head: string) => Promise<any>
        getBlame: (repo: string, ref: string, path: string) => Promise<any[]>
      }
      llm: {
        explain: (context: any) => Promise<any>
      }
    }
  }
}
