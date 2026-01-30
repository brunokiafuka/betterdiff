// Core types for the application

export interface Repo {
  id: string
  owner: string
  name: string
  fullName: string
  defaultBranch: string
  type: 'github' | 'local'
  localPath?: string // Only for local repos
}

export interface GitRef {
  name: string
  type: 'branch' | 'tag' | 'commit'
  sha: string
}

export interface Comparison {
  id: string
  repo: Repo
  baseRef: GitRef
  headRef: GitRef
  createdAt: string
  files: FileChange[]
  commits: Commit[]
}

export interface FileChange {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  additions: number
  deletions: number
  oldSha?: string
  newSha?: string
  patch?: string
}

export interface Commit {
  sha: string
  author: {
    name: string
    email: string
    date: string
  }
  message: string
  prNumber?: number
}

export interface BlameChunk {
  startLine: number
  endLine: number
  commit: Commit
}

export interface Explanation {
  summary: string[]
  behavioralChange: string
  risks: string[]
  testsToRun: string[]
  questions: string[]
}

export interface FileView {
  id: string
  comparisonId: string
  path: string
  oldContent: string | null
  newContent: string | null
  blameChunks: BlameChunk[]
}

export interface HotspotFile {
  path: string
  changeCount: number
  churn: number
  recencyScore: number
  authorCount: number
  hotspotScore: number
  lastModified: string
  commits: string[] // Array of commit SHAs
}

export interface HotspotAnalysis {
  repo: string
  ref: string
  timeWindow: number // days
  analyzedAt: string
  files: HotspotFile[]
}

export interface WorktreeInfo {
  path: string
  head?: string
  branch?: string
  detached?: boolean
  locked?: boolean
  lockedReason?: string
  prunable?: boolean
  prunableReason?: string
  isMain?: boolean
}

export interface WorktreeAddOptions {
  path: string
  commit?: string
  branch?: string
  useExistingBranch?: boolean
  resetBranch?: boolean
  detach?: boolean
  checkout?: boolean
  lock?: boolean
  lockReason?: string
  orphan?: boolean
  force?: boolean
  track?: boolean
  guessRemote?: boolean
}
