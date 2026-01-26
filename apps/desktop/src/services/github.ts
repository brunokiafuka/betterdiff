// Repository service (renderer side) - handles both GitHub and local repos
import { Repo, GitRef, Comparison } from '../types'

export class RepositoryService {
  async authenticate(token: string): Promise<{ success: boolean; user?: string; error?: string }> {
    return await window.electronAPI.github.auth(token)
  }

  async fetchRepositories(): Promise<Repo[]> {
    return await window.electronAPI.github.fetchRepos()
  }

  async listBranches(repo: Repo): Promise<GitRef[]> {
    if (repo.type === 'local') {
      return await window.electronAPI.local.listBranches(repo.localPath!)
    } else {
      return await window.electronAPI.github.listBranches(repo.fullName)
    }
  }

  async compareRefs(
    repo: Repo,
    baseRef: GitRef,
    headRef: GitRef
  ): Promise<Comparison> {
    let result
    if (repo.type === 'local') {
      result = await window.electronAPI.local.compareRefs(
        repo.localPath!,
        baseRef.name,
        headRef.name
      )
    } else {
      result = await window.electronAPI.github.compareRefs(
        repo.fullName,
        baseRef.name,
        headRef.name
      )
    }
    
    return {
      id: `${repo.id}-${baseRef.sha}-${headRef.sha}`,
      repo,
      baseRef,
      headRef,
      createdAt: new Date().toISOString(),
      files: result.files,
      commits: result.commits
    }
  }

  async getFileContent(repo: Repo, ref: GitRef, path: string): Promise<string> {
    if (repo.type === 'local') {
      return await window.electronAPI.local.getFileContent(
        repo.localPath!,
        ref.name,
        path
      )
    } else {
      return await window.electronAPI.github.getFileContent(
        repo.fullName,
        ref.sha,
        path
      )
    }
  }

  async getBlame(repo: Repo, ref: GitRef, path: string) {
    if (repo.type === 'local') {
      return await window.electronAPI.local.getBlame(
        repo.localPath!,
        ref.name,
        path
      )
    } else {
      return await window.electronAPI.github.getBlame(
        repo.fullName,
        ref.sha,
        path
      )
    }
  }

  async getRepoTree(repo: Repo, ref: GitRef): Promise<any[]> {
    if (repo.type === 'local') {
      return await window.electronAPI.local.getRepoTree(
        repo.localPath!,
        ref.name
      )
    } else {
      return await window.electronAPI.github.getRepoTree(
        repo.fullName,
        ref.sha
      )
    }
  }

  async getFileHistory(repo: Repo, path: string, ref: GitRef): Promise<any[]> {
    if (repo.type === 'local') {
      return await window.electronAPI.local.getFileHistory(
        repo.localPath!,
        path,
        ref.name
      )
    } else {
      return await window.electronAPI.github.getFileHistory(
        repo.fullName,
        path,
        ref.sha
      )
    }
  }

  async getCommit(repo: Repo, sha: string): Promise<any> {
    if (repo.type === 'local') {
      return await window.electronAPI.local.getCommit(
        repo.localPath!,
        sha
      )
    } else {
      return await window.electronAPI.github.getCommit(
        repo.fullName,
        sha
      )
    }
  }
}

export const repositoryService = new RepositoryService()
// Keep for backward compatibility
export const githubService = repositoryService
