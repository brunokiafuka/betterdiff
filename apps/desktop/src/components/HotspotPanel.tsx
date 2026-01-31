import React, { useState, useEffect } from 'react'
import { HotspotPanel as UiHotspotPanel } from '@whodidit/ui'
import type { HotspotAnalysis } from '@whodidit/ui'
import { useAppStore } from '../stores/appStore'
import { hotspotService } from '../services/hotspot'

export const HotspotPanel: React.FC = () => {
  const { currentRepo, headRef } = useAppStore()
  const [analysis, setAnalysis] = useState<HotspotAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeWindow, setTimeWindow] = useState(30)
  const [sortBy, setSortBy] = useState<'score' | 'changes' | 'churn'>('score')

  useEffect(() => {
    // Clear analysis when repo changes
    setAnalysis(null)
    setError(null)

    if (currentRepo && headRef && (currentRepo.type === 'github' || currentRepo.type === 'local')) {
      loadHotspots()
    }
  }, [currentRepo, headRef, timeWindow])

  const loadHotspots = async () => {
    if (!currentRepo || !headRef || (currentRepo.type !== 'github' && currentRepo.type !== 'local')) return

    setLoading(true)
    setError(null)
    try {
      const result = await hotspotService.analyzeRepo(currentRepo, headRef, timeWindow)
      setAnalysis(result)
    } catch (err: any) {
      setError(err.message || 'Failed to load hotspots')
      console.error('Failed to load hotspots:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileClick = (filePath: string) => {
    // Dispatch file-selected event to open the file in the editor
    // This is the same event that FileTreePanel uses
    window.dispatchEvent(new CustomEvent('file-selected', { detail: { path: filePath } }))
  }

  const showPanel = !!(currentRepo && (currentRepo.type === 'github' || currentRepo.type === 'local'))

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
      onRetry={loadHotspots}
      emptyMessage="No hotspots found"
      noRepoMessage="Please select a repository to analyze hotspots"
      showPanel={showPanel}
    />
  )
}
