// Utility functions for diff operations

import * as Diff from 'diff'

export interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: string[]
}

/**
 * Parse a unified diff patch into structured hunks
 */
export function parsePatch(patch: string): DiffHunk[] {
  const hunks: DiffHunk[] = []
  const lines = patch.split('\n')
  
  let currentHunk: DiffHunk | null = null
  
  for (const line of lines) {
    // Hunk header: @@ -oldStart,oldLines +newStart,newLines @@
    const hunkMatch = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/)
    if (hunkMatch) {
      if (currentHunk) {
        hunks.push(currentHunk)
      }
      currentHunk = {
        oldStart: parseInt(hunkMatch[1]),
        oldLines: parseInt(hunkMatch[2] || '1'),
        newStart: parseInt(hunkMatch[3]),
        newLines: parseInt(hunkMatch[4] || '1'),
        lines: []
      }
    } else if (currentHunk) {
      currentHunk.lines.push(line)
    }
  }
  
  if (currentHunk) {
    hunks.push(currentHunk)
  }
  
  return hunks
}

/**
 * Create a diff from two text strings
 */
export function createDiff(oldText: string, newText: string): string {
  const patch = Diff.createPatch('file', oldText, newText, '', '')
  return patch
}

/**
 * Get line numbers for changes in a diff
 */
export function getChangedLineNumbers(hunks: DiffHunk[]): {
  oldLines: number[]
  newLines: number[]
} {
  const oldLines: number[] = []
  const newLines: number[] = []
  
  for (const hunk of hunks) {
    let oldLine = hunk.oldStart
    let newLine = hunk.newStart
    
    for (const line of hunk.lines) {
      if (line.startsWith('-')) {
        oldLines.push(oldLine)
        oldLine++
      } else if (line.startsWith('+')) {
        newLines.push(newLine)
        newLine++
      } else {
        oldLine++
        newLine++
      }
    }
  }
  
  return { oldLines, newLines }
}

/**
 * Extract context around a specific line for LLM prompts
 */
export function extractContext(
  content: string,
  lineNumber: number,
  contextLines: number = 10
): string {
  const lines = content.split('\n')
  const start = Math.max(0, lineNumber - contextLines - 1)
  const end = Math.min(lines.length, lineNumber + contextLines)
  
  return lines.slice(start, end).join('\n')
}

/**
 * Check if a commit looks like a formatting-only change
 */
export function isFormattingCommit(message: string): boolean {
  const formattingKeywords = [
    'format',
    'prettier',
    'lint',
    'eslint',
    'style',
    'whitespace',
    'indent'
  ]
  
  const lowerMessage = message.toLowerCase()
  return formattingKeywords.some(keyword => lowerMessage.includes(keyword))
}

/**
 * Calculate diff statistics
 */
export function calculateDiffStats(patch: string): {
  additions: number
  deletions: number
  changes: number
} {
  const lines = patch.split('\n')
  let additions = 0
  let deletions = 0
  
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      additions++
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deletions++
    }
  }
  
  return {
    additions,
    deletions,
    changes: additions + deletions
  }
}
