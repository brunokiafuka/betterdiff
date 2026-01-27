import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Search, Globe, X, GitBranch, Loader2, Lock } from 'lucide-react'
import { setRepo } from '../stores/appStore'
import { useFetchRepos, useSearchRepos } from '../services/github'
import './Repos.css'
import { Footer } from './Footer'
import { track } from '../services/analytics'

const REPOS_PER_PAGE = 13

export const Repos: React.FC = () => {
  const navigate = useNavigate()
  const fetchRepos = useFetchRepos()
  const searchRepos = useSearchRepos()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [reposList, setReposList] = useState<{ repos: any[]; hasMore: boolean; currentPage: number }>({
    repos: [],
    hasMore: true,
    currentPage: 1,
  })
  const [searchResults, setSearchResults] = useState<{ repos: any[]; hasMore: boolean; currentPage: number }>({
    repos: [],
    hasMore: false,
    currentPage: 1,
  })
  const [recentRepos, setRecentRepos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

  const loadRepos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchRepos({ page: 1, perPage: REPOS_PER_PAGE })
      setReposList({
        repos: result.repos || [],
        hasMore: result.hasNext ?? false,
        currentPage: 1,
      })
    } catch (err: any) {
      console.error('Failed to load repos:', err)
      setError(err.message || 'Failed to load repositories')
      setReposList({ repos: [], hasMore: false, currentPage: 1 })
    } finally {
      setLoading(false)
    }
  }, [fetchRepos])

  useEffect(() => {
    loadRepos()
  }, [loadRepos])

  // Track when repos view is visible and data has loaded
  useEffect(() => {
    if (!loading) {
      track('repos_viewed', {
        surface: 'web',
        has_repos: reposList.repos.length > 0,
      })
    }
  }, [loading, reposList.repos.length])

  // Load recent repos from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('whodidit_recent_repos')
      if (stored) {
        const recent = JSON.parse(stored)
        setRecentRepos(recent.filter((r: any) => r.type === 'github').slice(0, 5))
      }
    } catch (err) {
      console.error('Failed to load recent repos:', err)
    }
  }, [])

  // Keyboard shortcut: Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSelectRepo = async (repo: any) => {
    try {
      // Ensure repo has type
      if (!repo.type) {
        repo.type = 'github'
      }

      setRepo(repo)

      try {
        const stored = localStorage.getItem('whodidit_recent_repos') || '[]'
        const recent = JSON.parse(stored)
        const filtered = recent.filter((r: any) => r.fullName !== repo.fullName)
        const updated = [{ ...repo, lastAccessed: new Date().toISOString() }, ...filtered].slice(0, 10)
        localStorage.setItem('whodidit_recent_repos', JSON.stringify(updated))
        setRecentRepos(updated.slice(0, 5))
      } catch (err) {
        console.error('Failed to update recent repos:', err)
      }

      navigate({
        to: '/repo/$owner/$name',
        params: { owner: repo.owner, name: repo.name },
        search: { path: undefined, oldcommit: undefined, newcommit: undefined }
      })
    } catch (err: any) {
      console.error('Failed to select repo:', err)
    }
  }

  const removeRecentRepo = (e: React.MouseEvent, repo: any) => {
    e.stopPropagation()
    try {
      const stored = localStorage.getItem('whodidit_recent_repos') || '[]'
      const recent = JSON.parse(stored).filter((r: any) => r.fullName !== repo.fullName)
      localStorage.setItem('whodidit_recent_repos', JSON.stringify(recent))
      setRecentRepos(recent.slice(0, 5))
    } catch (err) {
      console.error('Failed to remove recent repo:', err)
    }
  }

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300) // 300ms debounce delay

    return () => {
      clearTimeout(timer)
    }
  }, [searchQuery])

  // Load search results when debounced query changes
  const loadSearchResults = useCallback(async (query: string, page: number = 1) => {
    if (!query.trim()) {
      setSearchResults({ repos: [], hasMore: false, currentPage: 1 })
      return
    }

    setLoadingSearch(true)
    setError(null)
    try {
      const result = await searchRepos({
        page,
        perPage: REPOS_PER_PAGE,
        query: query.trim()
      })
      if (page === 1) {
        setSearchResults({
          repos: result.repos || [],
          hasMore: result.hasNext ?? false,
          currentPage: 1,
        })
      } else {
        setSearchResults(prev => ({
          repos: [...prev.repos, ...(result.repos || [])],
          hasMore: result.hasNext ?? false,
          currentPage: page,
        }))
      }
    } catch (err: any) {
      console.error('Failed to search repos:', err)
      setError(err.message || 'Failed to search repositories')
      setSearchResults({ repos: [], hasMore: false, currentPage: 1 })
    } finally {
      setLoadingSearch(false)
    }
  }, [fetchRepos])

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery) {
      loadSearchResults(debouncedSearchQuery, 1)
    } else {
      setSearchResults({ repos: [], hasMore: false, currentPage: 1 })
    }
  }, [debouncedSearchQuery, loadSearchResults])

  // Determine which repos to display
  const displayedRepos = debouncedSearchQuery ? searchResults.repos : reposList.repos
  const displayedHasMore = debouncedSearchQuery ? searchResults.hasMore : reposList.hasMore
  const displayedCurrentPage = debouncedSearchQuery ? searchResults.currentPage : reposList.currentPage
  const isSearching = debouncedSearchQuery.length > 0

  // Load more repos from API
  const loadMore = useCallback(async () => {
    if (loadingMore || loadingSearch || !displayedHasMore) {
      return
    }

    if (isSearching) {
      setLoadingSearch(true)
      try {
        const nextPage = displayedCurrentPage + 1
        await loadSearchResults(debouncedSearchQuery, nextPage)
      } catch (err: any) {
        console.error('Failed to load more search results:', err)
      } finally {
        setLoadingSearch(false)
      }
    } else {
      setLoadingMore(true)
      try {
        const nextPage = displayedCurrentPage + 1
        const result = await fetchRepos({ page: nextPage, perPage: REPOS_PER_PAGE })

        if (result && result.repos.length > 0) {
          setReposList(prev => ({
            repos: [...prev.repos, ...result.repos],
            hasMore: result.hasNext ?? false,
            currentPage: nextPage,
          }))
        } else {
          setReposList(prev => ({ ...prev, hasMore: false }))
        }
      } catch (err: any) {
        console.error('Failed to load more repos:', err)
        setReposList(prev => ({ ...prev, hasMore: false }))
      } finally {
        setLoadingMore(false)
      }
    }
  }, [loadingMore, loadingSearch, displayedHasMore, displayedCurrentPage, isSearching, debouncedSearchQuery, loadSearchResults, fetchRepos])


  return (
    <div className="repos-page">
      <div className="repos-container">
        {/* Header */}
        <div className="repos-header">
          <h1 className="repos-title">~/repos</h1>
          <p className="repos-subtitle">
            Browse and analyze your GitHub repositories. View file history, compare commits, and track changes.
          </p>
        </div>

        {/* Search Bar with Quick Tags */}
        <div className="repos-search-section">
          <div className="search-bar-container">
            <div className="search-bar">
              <Search size={18} className="search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button
                  className="search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
              <span className="search-shortcut">⌘K</span>
            </div>
          </div>

          {/* Quick Access Tags */}
          {recentRepos.length > 0 && (
            <div className="quick-tags">
              {recentRepos.map((repo) => (
                <button
                  key={repo.id}
                  className="quick-tag"
                  onClick={() => handleSelectRepo(repo)}
                >
                  <GitBranch size={12} />
                  <span>{repo.name}</span>
                  <button
                    className="quick-tag-remove"
                    onClick={(e) => removeRecentRepo(e, repo)}
                    aria-label="Remove from recent"
                  >
                    <X size={10} />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="repos-status">
          <span className="status-indicator"></span>
          <span className="status-text">
            {loading || loadingSearch ? 'Loading...' : displayedRepos.length > 0
              ? isSearching
                ? `Found ${displayedRepos.length} repositories`
                : `Showing ${displayedRepos.length} repositories${displayedHasMore ? '...' : ''}`
              : '0 repositories'
            }
          </span>
        </div>

        {/* Repos Grid */}
        <div className="repos-content">
          {loading || (loadingSearch && displayedRepos.length === 0) ? (
            <div className="repos-loading">
              <div className="spinner"></div>
              <p>{isSearching ? 'Searching repositories...' : 'Loading repositories...'}</p>
            </div>
          ) : error ? (
            <div className="repos-error">
              <p className="error-message">{error}</p>
            </div>
          ) : displayedRepos.length > 0 ? (
            <>
              <div className="repos-grid">
                {displayedRepos.map((repo) => (
                  <div
                    key={repo.id || repo.fullName}
                    className="repo-card"
                    onClick={() => handleSelectRepo(repo)}
                  >
                    <div className="repo-card-header">
                      {repo.private ? (
                        <Lock size={20} className="repo-card-icon" />
                      ) : (
                        <Globe size={20} className="repo-card-icon" />
                      )}
                      <div className="repo-card-info">
                        <span className="repo-card-name">{repo.name}</span>
                        <span className="repo-card-owner">{repo.owner}</span>
                      </div>
                    </div>
                    <div className="repo-card-footer">
                      <span className="repo-card-branch">
                        <GitBranch size={12} />
                        {repo.defaultBranch || 'main'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {displayedHasMore && (
                <div className="load-more-container">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore || loadingSearch}
                    className="load-more-button"
                  >
                    {loadingMore || loadingSearch ? (
                      <>
                        <Loader2 size={20} className="load-more-spinner" />
                        <span>Loading more...</span>
                      </>
                    ) : (
                      <span>Load more</span>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : isSearching ? (
            <div className="repos-empty">
              <p>No repositories match "{debouncedSearchQuery}"</p>
            </div>
          ) : (
            <div className="repos-empty">
              <p>No repositories found.</p>
            </div>
          )}
        </div>


        <Footer />
      </div>
    </div>
  )
}
