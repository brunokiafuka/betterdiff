import { WorktreeAddOptions, WorktreeInfo } from '../types'

export class WorktreeService {
  async list(repoPath: string): Promise<WorktreeInfo[]> {
    return window.electronAPI.local.worktreeList(repoPath)
  }

  async add(repoPath: string, options: WorktreeAddOptions): Promise<{ success: boolean }> {
    return window.electronAPI.local.worktreeAdd(repoPath, options)
  }

  async remove(repoPath: string, worktreePath: string, force?: boolean): Promise<{ success: boolean }> {
    return window.electronAPI.local.worktreeRemove(repoPath, worktreePath, force)
  }

  async move(
    repoPath: string,
    worktreePath: string,
    newPath: string,
    force?: boolean
  ): Promise<{ success: boolean }> {
    return window.electronAPI.local.worktreeMove(repoPath, worktreePath, newPath, force)
  }

  async prune(repoPath: string, dryRun?: boolean): Promise<{ success: boolean }> {
    return window.electronAPI.local.worktreePrune(repoPath, dryRun)
  }

  async lock(repoPath: string, worktreePath: string, reason?: string): Promise<{ success: boolean }> {
    return window.electronAPI.local.worktreeLock(repoPath, worktreePath, reason)
  }

  async unlock(repoPath: string, worktreePath: string): Promise<{ success: boolean }> {
    return window.electronAPI.local.worktreeUnlock(repoPath, worktreePath)
  }
}

export const worktreeService = new WorktreeService()
