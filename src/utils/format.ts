// Format utilities for displaying dates, file sizes, etc.

/**
 * Format a date relative to now (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - then.getTime()
  
  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)
  
  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (weeks < 4) return `${weeks}w ago`
  if (months < 12) return `${months}mo ago`
  return `${years}y ago`
}

/**
 * Format a date as a readable string
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format a commit SHA (short version)
 */
export function formatCommitSha(sha: string, length: number = 7): string {
  return sha.substring(0, length)
}

/**
 * Format file path for display (shorten long paths)
 */
export function formatFilePath(path: string, maxLength: number = 50): string {
  if (path.length <= maxLength) return path
  
  const parts = path.split('/')
  if (parts.length <= 2) return path
  
  // Keep first and last parts, replace middle with ...
  return `${parts[0]}/.../${parts[parts.length - 1]}`
}

/**
 * Format line count with plural handling
 */
export function formatLineCount(count: number): string {
  return `${count} line${count !== 1 ? 's' : ''}`
}

/**
 * Format additions/deletions with color codes
 */
export function formatDiffStats(additions: number, deletions: number): string {
  const total = additions + deletions
  if (total === 0) return 'No changes'
  
  const parts = []
  if (additions > 0) parts.push(`+${additions}`)
  if (deletions > 0) parts.push(`−${deletions}`)
  
  return parts.join(' ')
}

/**
 * Get file extension from path
 */
export function getFileExtension(path: string): string {
  const parts = path.split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

/**
 * Get file name from path
 */
export function getFileName(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1]
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Parse PR number from commit message
 */
export function extractPRNumber(message: string): number | null {
  const match = message.match(/#(\d+)/)
  return match ? parseInt(match[1]) : null
}
