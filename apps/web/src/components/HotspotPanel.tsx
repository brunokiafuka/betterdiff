import { useState, useEffect, useRef } from 'react'
import { HotspotPanel as UiHotspotPanel } from '@whodidit/ui'
import type { HotspotAnalysis } from '@whodidit/ui'
import { currentRepo, headRef } from '../stores/appStore'
import { useAnalyzeHotspots } from '../services/github'

export const HOTSPOT_CACHE_PREFIX = 'whodidit_hotspot_'

const getCacheKey = (repoFullName: string, ref: string, timeWindow: number) => {
  return `${HOTSPOT_CACHE_PREFIX}${repoFullName}_${ref}_${timeWindow}`
}

const getCachedAnalysis = (key: string): HotspotAnalysis | null => {
  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const data = JSON.parse(cached)
    return data.analysis || null
  } catch (err) {
    console.error('Failed to read hotspot cache:', err)
    return null
  }
}

const setCachedAnalysis = (key: string, analysis: HotspotAnalysis) => {
  try {
    localStorage.setItem(key, JSON.stringify({
      analysis,
    }))
  } catch (err) {
    console.error('Failed to cache hotspot analysis:', err)
  }
}

export const HotspotPanel: React.FC = () => {
  const analyzeHotspots = useAnalyzeHotspots()
  const repo = currentRepo.value
  const ref = headRef.value
  const [analysis, setAnalysis] = useState<HotspotAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeWindow, setTimeWindow] = useState(30)
  const [sortBy, setSortBy] = useState<'score' | 'changes' | 'churn'>('score')
  const lastFetchedRef = useRef<string>('')

  useEffect(() => {
    if (!repo || repo.type !== 'github') {
      setAnalysis(null)
      setError(null)
      return
    }

    const branch = ref?.name || repo.defaultBranch || 'main'
    const cacheKey = getCacheKey(repo.fullName, branch, timeWindow)

    // Check cache first
    const cached = getCachedAnalysis(cacheKey)
    if (cached) {
      setAnalysis(cached)
      setError(null)
      loadHotspots(true)
      return
    }

    // Only fetch if we don't have cached data
    loadHotspots()
  }, [repo, ref, timeWindow])

  const loadHotspots = async (useCache: boolean = false) => {
    if (!repo || repo.type !== 'github') return

    const branch = ref?.name || repo.defaultBranch || 'main'
    const cacheKey = getCacheKey(repo.fullName, branch, timeWindow)

    // Skip if we already fetched this exact combination
    const fetchKey = `${repo.fullName}_${branch}_${timeWindow}`
    if (lastFetchedRef.current === fetchKey && analysis) {
      return
    }

    if (!useCache) {
      setLoading(true)
    }

    setError(null)
    try {
      const result = await analyzeHotspots({
        repoFullName: repo.fullName,
        ref: branch,
        timeWindow,
      })
      setAnalysis(result)

      setCachedAnalysis(cacheKey, result)
      lastFetchedRef.current = fetchKey
    } catch (err: any) {
      setError(err.message || 'Failed to load hotspots')
      console.error('Failed to load hotspots:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileClick = (filePath: string) => {
    window.dispatchEvent(new CustomEvent('file-selected', { detail: { path: filePath } }))
  }

  const showPanel = !!(repo && repo.type === 'github')

  return (
    <UiHotspotPanel
      analysis={analysis}
      loading={loading}
      error={error}
      timeWindow={timeWindow}
      sortBy={sortBy}
      onTimeWindowChange={setTimeWindow}
      onSortByChange={setSortBy}
      onFileClick={handleFileClick}
      onRetry={() => loadHotspots()}
      emptyMessage="No hotspots found"
      noRepoMessage="Please select a repository to analyze hotspots"
      showPanel={showPanel}
    />
  )
}
