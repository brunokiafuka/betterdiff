import { useState, useEffect, useRef } from 'react'
import { X, Globe } from 'lucide-react'
import './RepoSearchModal.css'

interface RepoSearchModalProps {
  repos: any[]
  recentRepos: any[]
  onSelect: (repo: any) => void
  onClose: () => void
  onRemoveRecent?: (repo: any) => void
}

export const RepoSearchModal: React.FC<RepoSearchModalProps> = ({
  repos,
  recentRepos,
  onSelect,
  onClose,
  onRemoveRecent
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Filter repos based on search query
  const filteredRepos = searchQuery
    ? repos.filter(repo => 
        repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.owner.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : repos

  // Combine recent and filtered, removing duplicates
  const displayRepos = searchQuery
    ? filteredRepos
    : [
        ...recentRepos,
        ...filteredRepos.filter(r => 
          !recentRepos.some(rr => r.fullName === rr.fullName)
        )
      ]

  useEffect(() => {
    // Focus search input when modal opens
    searchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    // Reset selected index when search changes
    setSelectedIndex(0)
  }, [searchQuery])

  useEffect(() => {
    // Scroll selected item into view
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, displayRepos.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && displayRepos[selectedIndex]) {
      e.preventDefault()
      onSelect(displayRepos[selectedIndex])
    }
  }

  const handleRemoveRecent = (e: React.MouseEvent, repo: any) => {
    e.stopPropagation()
    if (onRemoveRecent) {
      onRemoveRecent(repo)
    }
  }

  return (
    <div className="repo-search-modal-overlay" onClick={onClose}>
      <div className="repo-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-instructions">
            Select to open (↑↓ to navigate, Enter to select, Esc to close)
          </div>
          <div className="modal-header-right">
            <span className="modal-label">repositories</span>
            <button className="modal-close" onClick={onClose} title="Close (Esc)">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="modal-search">
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="modal-content" ref={listRef}>
          {displayRepos.length === 0 ? (
            <div className="modal-empty">
              <p>No repositories found</p>
              {searchQuery && (
                <p className="empty-hint">Try a different search term</p>
              )}
            </div>
          ) : (
            displayRepos.map((repo, index) => {
              const isRecent = recentRepos.some(r => r.fullName === repo.fullName) && !searchQuery
              return (
                <div
                  key={repo.id || repo.fullName}
                  className={`repo-item ${index === selectedIndex ? 'selected' : ''} ${isRecent ? 'recent' : ''}`}
                  onClick={() => onSelect(repo)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <Globe size={18} className="repo-item-icon" />
                  <div className="repo-item-details">
                    <div className="repo-item-name">{repo.fullName || repo.name}</div>
                    <div className="repo-item-path">{repo.owner ? `${repo.owner}/${repo.name}` : ''}</div>
                  </div>
                  {isRecent && onRemoveRecent && (
                    <button
                      className="repo-item-remove"
                      onClick={(e) => handleRemoveRecent(e, repo)}
                      title="Remove from recent"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>

      </div>
    </div>
  )
}
