// Hotspot detection service
import { Repo, GitRef, HotspotAnalysis } from '../types'

export class HotspotService {
  async analyzeRepo(repo: Repo, ref: GitRef, timeWindow: number = 30): Promise<HotspotAnalysis> {
    if (repo.type === 'github') {
      return await window.electronAPI.hotspot.analyze(repo.fullName, ref.sha, timeWindow)
    } else if (repo.type === 'local' && repo.localPath) {
      return await window.electronAPI.localHotspot.analyze(repo.localPath, ref.name, timeWindow)
    } else {
      throw new Error('Invalid repository type for hotspot analysis')
    }
  }

  async getFileHotspot(
    repo: Repo,
    ref: GitRef,
    filePath: string,
    timeWindow: number = 30
  ): Promise<{ path: string; hotspotScore: number; changeCount: number } | null> {
    const analysis = await this.analyzeRepo(repo, ref, timeWindow)
    const file = analysis.files.find(f => f.path === filePath)
    
    if (!file) return null
    
    return {
      path: file.path,
      hotspotScore: file.hotspotScore,
      changeCount: file.changeCount
    }
  }
}

export const hotspotService = new HotspotService()
