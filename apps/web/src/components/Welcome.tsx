import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Search, Globe, X, GitBranch, Loader2 } from 'lucide-react'
import { setRepo } from '../stores/appStore'
import { useFetchRepos } from '../services/github'
import './Welcome.css'

const REPOS_PER_PAGE = 12

export const Welcome: React.FC = () => {
  const navigate = useNavigate()
  const fetchRepos = useFetchRepos()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [repos, setRepos] = useState<any[]>([])
  const [recentRepos, setRecentRepos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(REPOS_PER_PAGE)

  // Fetch repos on mount
  useEffect(() => {
    const loadRepos = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await fetchRepos({})
        setRepos(result || [])
      } catch (err: any) {
        console.error('Failed to load repos:', err)
        setError(err.message || 'Failed to load repositories')
        setRepos([])
      } finally {
        setLoading(false)
      }
    }

    loadRepos()
  }, [fetchRepos])

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

      // Update recent repos in localStorage
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

      // Navigate to repo viewer
      navigate({ to: '/repo/$owner/$name', params: { owner: repo.owner, name: repo.name } })
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

  // Filter repos based on search query
  const filteredRepos = useMemo(() =>
    repos.filter((repo) =>
      repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.owner.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [repos, searchQuery]
  )

  // Reset visible count when search query changes
  useEffect(() => {
    setVisibleCount(REPOS_PER_PAGE)
  }, [searchQuery])

  // Get visible repos for infinite scroll
  const visibleRepos = useMemo(() =>
    filteredRepos.slice(0, visibleCount),
    [filteredRepos, visibleCount]
  )

  const hasMore = visibleCount < filteredRepos.length

  // Load more repos
  const loadMore = useCallback(() => {
    if (hasMore) {
      setVisibleCount(prev => Math.min(prev + REPOS_PER_PAGE, filteredRepos.length))
    }
  }, [hasMore, filteredRepos.length])

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [hasMore, loadMore])

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
                  key={repo.id || repo.fullName}
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
            {loading ? 'Loading...' : filteredRepos.length > 0
              ? `Showing ${visibleRepos.length} of ${filteredRepos.length} repositories`
              : '0 repositories'
            }
          </span>
        </div>

        {/* Repos Grid */}
        <div className="repos-content">
          {loading ? (
            <div className="repos-loading">
              <div className="spinner"></div>
              <p>Loading repositories...</p>
            </div>
          ) : error ? (
            <div className="repos-error">
              <p className="error-message">{error}</p>
            </div>
          ) : filteredRepos.length > 0 ? (
            <>
              <div className="repos-grid">
                {visibleRepos.map((repo) => (
                  <div
                    key={repo.id || repo.fullName}
                    className="repo-card"
                    onClick={() => handleSelectRepo(repo)}
                  >
                    <div className="repo-card-header">
                      <Globe size={20} className="repo-card-icon" />
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

              {/* Infinite Scroll Trigger */}
              {hasMore && (
                <div ref={loadMoreRef} className="load-more-trigger">
                  <Loader2 size={20} className="load-more-spinner" />
                  <span>Loading more...</span>
                </div>
              )}
            </>
          ) : searchQuery ? (
            <div className="repos-empty">
              <p>No repositories match "{searchQuery}"</p>
            </div>
          ) : (
            <div className="repos-empty">
              <p>No repositories found.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="repos-footer">
          <span className="footer-text">whodidit::v0.1.0</span>
        </div>
      </div>
    </div>
  )
}
