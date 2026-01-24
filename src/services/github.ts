// GitHub API service (renderer side)
import { Repo, GitRef, Comparison, FileChange, Commit } from '../types'

export class GitHubService {
  async authenticate(token: string): Promise<boolean> {
    const result = await window.electronAPI.github.auth(token)
    return result.success
  }

  async fetchRepositories(): Promise<Repo[]> {
    return await window.electronAPI.github.fetchRepos()
  }

  async compareRefs(
    repo: Repo,
    baseRef: GitRef,
    headRef: GitRef
  ): Promise<Comparison> {
    const result = await window.electronAPI.github.compareRefs(
      repo.fullName,
      baseRef.name,
      headRef.name
    )
    
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

  async getBlame(repo: Repo, ref: GitRef, path: string) {
    return await window.electronAPI.github.getBlame(
      repo.fullName,
      ref.sha,
      path
    )
  }
}

export const githubService = new GitHubService()
