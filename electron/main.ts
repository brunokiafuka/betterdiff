import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { Octokit } from '@octokit/rest'
import fs from 'fs'
import os from 'os'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Store GitHub token in memory (for testing - will use secure storage later)
let githubToken: string | null = null
let octokit: Octokit | null = null

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  // Load app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  // Load config on startup
  const config = readConfig()
  if (config?.githubToken) {
    githubToken = config.githubToken
    octokit = new Octokit({ auth: config.githubToken })
    console.log('✓ Loaded GitHub token from config')
  }
  
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers for GitHub API, auth, cache management
ipcMain.handle('github:auth', async (_event, token: string) => {
  try {
    githubToken = token
    octokit = new Octokit({ auth: token })
    
    // Test the token by fetching user info
    const { data } = await octokit.users.getAuthenticated()
    console.log('✓ Authenticated as:', data.login)
    
    return { success: true, user: data.login }
  } catch (error: any) {
    console.error('Authentication failed:', error.message)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('github:fetchRepos', async (_event) => {
  if (!octokit) {
    throw new Error('Not authenticated')
  }
  
  try {
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100
    })
    
    return data.map(repo => ({
      id: repo.id.toString(),
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      defaultBranch: repo.default_branch
    }))
  } catch (error: any) {
    console.error('Failed to fetch repos:', error.message)
    return []
  }
})

ipcMain.handle('github:compareRefs', async (_event, repoFullName: string, base: string, head: string) => {
  if (!octokit) {
    throw new Error('Not authenticated')
  }
  
  try {
    const [owner, repo] = repoFullName.split('/')
    
    console.log(`Comparing ${owner}/${repo}: ${base}...${head}`)
    
    const { data } = await octokit.repos.compareCommits({
      owner,
      repo,
      base,
      head
    })
    
    return {
      files: data.files?.map(file => {
        // Map GitHub status to our FileChange status
        let status: 'added' | 'modified' | 'deleted' | 'renamed' = 'modified'
        if (file.status === 'added') status = 'added'
        else if (file.status === 'removed') status = 'deleted'
        else if (file.status === 'renamed') status = 'renamed'
        else if (file.status === 'modified' || file.status === 'changed') status = 'modified'
        
        return {
          path: file.filename,
          status,
          additions: file.additions,
          deletions: file.deletions,
          oldSha: status !== 'added' ? data.base_commit.sha : undefined,
          newSha: status !== 'deleted' ? data.commits[data.commits.length - 1]?.sha : undefined,
          patch: file.patch
        }
      }) || [],
      commits: data.commits.map(commit => ({
        sha: commit.sha,
        author: {
          name: commit.commit.author?.name || 'Unknown',
          email: commit.commit.author?.email || '',
          date: commit.commit.author?.date || ''
        },
        message: commit.commit.message
      }))
    }
  } catch (error: any) {
    console.error('Failed to compare refs:', error.message)
    throw error
  }
})

ipcMain.handle('github:getFileContent', async (_event, repoFullName: string, ref: string, filePath: string) => {
  if (!octokit) {
    throw new Error('Not authenticated')
  }
  
  try {
    const [owner, repo] = repoFullName.split('/')
    
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref
    })
    
    // GitHub returns base64 encoded content
    if ('content' in data && data.content) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8')
      return content
    }
    
    return ''
  } catch (error: any) {
    console.error('Failed to fetch file content:', error.message)
    return ''
  }
})

ipcMain.handle('github:listBranches', async (_event, repoFullName: string) => {
  if (!octokit) {
    throw new Error('Not authenticated')
  }
  
  try {
    const [owner, repo] = repoFullName.split('/')
    
    const { data } = await octokit.repos.listBranches({
      owner,
      repo,
      per_page: 100
    })
    
    return data.map(branch => ({
      name: branch.name,
      type: 'branch' as const,
      sha: branch.commit.sha
    }))
  } catch (error: any) {
    console.error('Failed to list branches:', error.message)
    return []
  }
})

ipcMain.handle('github:getRepoTree', async (_event, repoFullName: string, ref: string) => {
  if (!octokit) {
    throw new Error('Not authenticated')
  }
  
  try {
    const [owner, repo] = repoFullName.split('/')
    
    const { data } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: ref,
      recursive: 'true'
    })
    
    return data.tree.filter((item: any) => item.type === 'blob')
  } catch (error: any) {
    console.error('Failed to get repo tree:', error.message)
    throw error
  }
})

ipcMain.handle('github:getFileHistory', async (_event, repoFullName: string, filePath: string, ref: string) => {
  if (!octokit) {
    throw new Error('Not authenticated')
  }
  
  try {
    const [owner, repo] = repoFullName.split('/')
    
    const { data } = await octokit.repos.listCommits({
      owner,
      repo,
      path: filePath,
      sha: ref,
      per_page: 100
    })
    
    return data
  } catch (error: any) {
    console.error('Failed to get file history:', error.message)
    throw error
  }
})

ipcMain.handle('github:getCommit', async (_event, repoFullName: string, sha: string) => {
  if (!octokit) {
    console.error('getCommit: Not authenticated')
    throw new Error('Not authenticated')
  }
  
  try {
    const [owner, repo] = repoFullName.split('/')
    
    const { data } = await octokit.repos.getCommit({
      owner,
      repo,
      ref: sha
    })
    
    // Extract PR number from commit message
    const prMatch = data.commit.message.match(/#(\d+)/)
    const prNumber = prMatch ? parseInt(prMatch[1]) : undefined
    
    return {
      sha: data.sha,
      shortSha: data.sha.substring(0, 7),
      message: data.commit.message,
      prNumber,
      author: {
        name: data.commit.author?.name || 'Unknown',
        email: data.commit.author?.email || '',
        date: data.commit.author?.date || ''
      },
      committer: {
        name: data.commit.committer?.name || 'Unknown',
        email: data.commit.committer?.email || '',
        date: data.commit.committer?.date || ''
      },
      stats: {
        additions: data.stats?.additions || 0,
        deletions: data.stats?.deletions || 0,
        total: data.stats?.total || 0
      },
      files: data.files?.map((file: any) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes
      })) || [],
      url: data.html_url
    }
  } catch (error: any) {
    console.error('Failed to get commit:', error.message)
    throw error
  }
})

ipcMain.handle('github:getBlame', async (_event, repo: string, ref: string, path: string) => {
  // Will implement with GitHub GraphQL
  return []
})

ipcMain.handle('llm:explain', async (_event, context: any) => {
  // Will implement LLM integration
  return { summary: '', risks: [], tests: [] }
})

// Config management
const CONFIG_DIR = path.join(os.homedir(), '.whodidit')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

function readConfig(): any {
  ensureConfigDir()
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      console.error('Failed to read config:', error)
      return null
    }
  }
  return null
}

function writeConfig(config: any): void {
  ensureConfigDir()
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to write config:', error)
    throw error
  }
}

ipcMain.handle('config:read', async () => {
  return readConfig()
})

ipcMain.handle('config:write', async (_event, config: any) => {
  writeConfig(config)
  // If config has token, also set it in memory
  if (config.githubToken) {
    githubToken = config.githubToken
    octokit = new Octokit({ auth: config.githubToken })
  }
  return { success: true }
})

ipcMain.handle('config:exists', async () => {
  return fs.existsSync(CONFIG_FILE)
})

// Helper function to execute git commands
function execGitCommand(repoPath: string, command: string): string {
  try {
    return execSync(`git ${command}`, {
      cwd: repoPath,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim()
  } catch (error: any) {
    throw new Error(`Git command failed: ${error.message}`)
  }
}

// Helper function to check if a path is a git repository
function isGitRepo(repoPath: string): boolean {
  return fs.existsSync(path.join(repoPath, '.git'))
}

// IPC handlers for local repositories
ipcMain.handle('local:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: 'Select Git Repository Folder'
  })
  
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  
  const selectedPath = result.filePaths[0]
  
  if (!isGitRepo(selectedPath)) {
    throw new Error('Selected folder is not a git repository')
  }
  
  try {
    // Get repo info
    const name = path.basename(selectedPath)
    const defaultBranch = execGitCommand(selectedPath, 'symbolic-ref --short HEAD') || 'main'
    let remoteUrl = ''
    try {
      remoteUrl = execGitCommand(selectedPath, 'config --get remote.origin.url')
    } catch (e) {
      // No remote configured
    }
    
    // Try to extract owner from remote URL if available
    let owner = 'local'
    if (remoteUrl) {
      const match = remoteUrl.match(/(?:github\.com[/:]|git@github\.com:)([^/]+)\/([^/]+?)(?:\.git)?$/)
      if (match) {
        owner = match[1]
      }
    }
    
    return {
      id: `local-${selectedPath}`,
      owner,
      name,
      fullName: `${owner}/${name}`,
      defaultBranch,
      type: 'local' as const,
      localPath: selectedPath
    }
  } catch (error: any) {
    throw new Error(`Failed to read repository: ${error.message}`)
  }
})

ipcMain.handle('local:listBranches', async (_event, repoPath: string) => {
  try {
    // Get local branches - use simpler command that works in all git versions
    const localBranchesOutput = execGitCommand(repoPath, 'branch')
    const localBranches = localBranchesOutput.split('\n')
      .filter(line => line.trim() && !line.includes('HEAD'))
      .map(branchLine => {
        // Remove * marker and whitespace
        const name = branchLine.replace(/^\*\s*/, '').trim()
        if (!name) return null
        try {
          const sha = execGitCommand(repoPath, `rev-parse ${name}`)
          return { name, sha, type: 'branch' as const }
        } catch (e) {
          console.error(`Failed to get SHA for branch ${name}:`, e)
          return null
        }
      })
      .filter((b): b is { name: string; sha: string; type: 'branch' } => b !== null)
    
    // Get remote branches
    let remoteBranches: { name: string; sha: string; type: 'branch' }[] = []
    try {
      const remoteBranchesOutput = execGitCommand(repoPath, 'branch -r')
      remoteBranches = remoteBranchesOutput.split('\n')
        .filter(line => line.trim() && !line.includes('HEAD'))
        .map(ref => {
          const name = ref.trim().replace(/^remotes\//, '')
          if (!name) return null
          try {
            const sha = execGitCommand(repoPath, `rev-parse ${ref.trim()}`)
            return { name, sha, type: 'branch' as const }
          } catch (e) {
            console.error(`Failed to get SHA for remote branch ${name}:`, e)
            return null
          }
        })
        .filter((b): b is { name: string; sha: string; type: 'branch' } => b !== null)
    } catch (e) {
      // No remotes configured
      console.log('No remote branches found or error:', e)
    }
    
    // Get tags
    let tags: { name: string; sha: string; type: 'tag' }[] = []
    try {
      const tagsOutput = execGitCommand(repoPath, 'tag')
      tags = tagsOutput.split('\n')
        .filter(line => line.trim())
        .map(tagName => {
          const name = tagName.trim()
          try {
            const sha = execGitCommand(repoPath, `rev-parse ${name}`)
            return { name, sha, type: 'tag' as const }
          } catch (e) {
            return null
          }
        })
        .filter((t): t is { name: string; sha: string; type: 'tag' } => t !== null)
    } catch (e) {
      // No tags
    }
    
    // Combine and deduplicate by name
    const allRefs = [...localBranches, ...remoteBranches, ...tags]
    const uniqueRefs = new Map<string, { name: string; sha: string; type: 'branch' | 'tag' }>()
    for (const ref of allRefs) {
      if (!uniqueRefs.has(ref.name)) {
        uniqueRefs.set(ref.name, ref)
      }
    }
    
    return Array.from(uniqueRefs.values())
  } catch (error: any) {
    console.error('Failed to list branches:', error.message)
    return []
  }
})

ipcMain.handle('local:compareRefs', async (_event, repoPath: string, base: string, head: string) => {
  try {
    // Get diff stats
    const diffOutput = execGitCommand(repoPath, `diff --stat ${base}...${head}`)
    
    // Get list of changed files
    const filesOutput = execGitCommand(repoPath, `diff --name-status ${base}...${head}`)
    const files = filesOutput.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const match = line.match(/^([AMD])\s+(.+)$/)
        if (!match) return null
        
        const [, status, filePath] = match
        let fileStatus: 'added' | 'modified' | 'deleted' | 'renamed' = 'modified'
        if (status === 'A') fileStatus = 'added'
        else if (status === 'D') fileStatus = 'deleted'
        else if (status === 'M') fileStatus = 'modified'
        
        // Get additions and deletions for this file
        const statLine = execGitCommand(repoPath, `diff --numstat ${base}...${head} -- "${filePath}"`)
          .split('\n')[0] || ''
        const statMatch = statLine.match(/^(\d+)\s+(\d+)/)
        const additions = statMatch ? parseInt(statMatch[1]) : 0
        const deletions = statMatch ? parseInt(statMatch[2]) : 0
        
        // Get patch
        let patch = ''
        try {
          patch = execGitCommand(repoPath, `diff ${base}...${head} -- "${filePath}"`)
        } catch (e) {
          // File might be binary or not exist
        }
        
        // Get SHAs
        let oldSha: string | undefined
        let newSha: string | undefined
        try {
          if (fileStatus !== 'added') {
            oldSha = execGitCommand(repoPath, `rev-parse ${base}:${filePath}`).split('\n')[0]
          }
          if (fileStatus !== 'deleted') {
            newSha = execGitCommand(repoPath, `rev-parse ${head}:${filePath}`).split('\n')[0]
          }
        } catch (e) {
          // SHA might not be available
        }
        
        return {
          path: filePath,
          status: fileStatus,
          additions,
          deletions,
          oldSha,
          newSha,
          patch
        }
      })
      .filter((f): f is NonNullable<typeof f> => f !== null)
    
    // Get commits
    const commitsOutput = execGitCommand(repoPath, `log --format="%H|%an|%ae|%ad|%s" --date=iso ${base}..${head}`)
    const commits = commitsOutput.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [sha, name, email, date, ...messageParts] = line.split('|')
        const message = messageParts.join('|')
        return {
          sha,
          author: {
            name: name || 'Unknown',
            email: email || '',
            date: date || new Date().toISOString()
          },
          message
        }
      })
    
    return {
      files,
      commits
    }
  } catch (error: any) {
    console.error('Failed to compare refs:', error.message)
    throw error
  }
})

ipcMain.handle('local:getFileContent', async (_event, repoPath: string, ref: string, filePath: string) => {
  try {
    return execGitCommand(repoPath, `show ${ref}:${filePath}`)
  } catch (error: any) {
    console.error('Failed to get file content:', error.message)
    return ''
  }
})

ipcMain.handle('local:getRepoTree', async (_event, repoPath: string, ref: string) => {
  try {
    const treeOutput = execGitCommand(repoPath, `ls-tree -r --name-only ${ref}`)
    return treeOutput.split('\n')
      .filter(line => line.trim())
      .map(path => ({ path, type: 'blob' }))
  } catch (error: any) {
    console.error('Failed to get repo tree:', error.message)
    throw error
  }
})

ipcMain.handle('local:getFileHistory', async (_event, repoPath: string, filePath: string, ref: string) => {
  try {
    const commitsOutput = execGitCommand(repoPath, `log --format="%H|%an|%ae|%ad|%s" --date=iso ${ref} -- "${filePath}"`)
    return commitsOutput.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [sha, name, email, date, ...messageParts] = line.split('|')
        const message = messageParts.join('|')
        return {
          sha,
          commit: {
            author: {
              name: name || 'Unknown',
              email: email || '',
              date: date || new Date().toISOString()
            },
            message
          }
        }
      })
  } catch (error: any) {
    console.error('Failed to get file history:', error.message)
    throw error
  }
})

ipcMain.handle('local:getCommit', async (_event, repoPath: string, sha: string) => {
  try {
    const commitInfo = execGitCommand(repoPath, `show --format="%H|%an|%ae|%ad|%cn|%ce|%cd|%s" --stat --date=iso ${sha}`)
    const lines = commitInfo.split('\n')
    const header = lines[0]
    const [fullSha, authorName, authorEmail, authorDate, committerName, committerEmail, committerDate, ...messageParts] = header.split('|')
    const message = messageParts.join('|')
    
    // Parse stats from the stat section
    let additions = 0
    let deletions = 0
    const statLine = lines.find(line => line.includes('file changed') || line.includes('files changed'))
    if (statLine) {
      const statMatch = statLine.match(/(\d+)\s+file.*?(\d+)\s+insertion.*?(\d+)\s+deletion/)
      if (statMatch) {
        additions = parseInt(statMatch[2]) || 0
        deletions = parseInt(statMatch[3]) || 0
      }
    }
    
    // Get changed files
    const filesOutput = execGitCommand(repoPath, `diff-tree --no-commit-id --name-status -r ${sha}`)
    const files = filesOutput.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const match = line.match(/^([AMD])\s+(.+)$/)
        if (!match) return null
        
        const [, status, filename] = match
        const fileStat = execGitCommand(repoPath, `diff --numstat ${sha}^..${sha} -- "${filename}"`)
          .split('\n')[0] || ''
        const statMatch = fileStat.match(/^(\d+)\s+(\d+)/)
        
        return {
          filename,
          status,
          additions: statMatch ? parseInt(statMatch[1]) : 0,
          deletions: statMatch ? parseInt(statMatch[2]) : 0,
          changes: (statMatch ? parseInt(statMatch[1]) : 0) + (statMatch ? parseInt(statMatch[2]) : 0)
        }
      })
      .filter((f): f is NonNullable<typeof f> => f !== null)
    
    // Extract PR number from commit message
    const prMatch = message.match(/#(\d+)/)
    const prNumber = prMatch ? parseInt(prMatch[1]) : undefined
    
    return {
      sha: fullSha,
      shortSha: fullSha.substring(0, 7),
      message,
      prNumber,
      author: {
        name: authorName || 'Unknown',
        email: authorEmail || '',
        date: authorDate || new Date().toISOString()
      },
      committer: {
        name: committerName || 'Unknown',
        email: committerEmail || '',
        date: committerDate || new Date().toISOString()
      },
      stats: {
        additions,
        deletions,
        total: additions + deletions
      },
      files,
      url: undefined // Local repos don't have URLs
    }
  } catch (error: any) {
    console.error('Failed to get commit:', error.message)
    throw error
  }
})

ipcMain.handle('local:getBlame', async (_event, repoPath: string, ref: string, filePath: string) => {
  try {
    const blameOutput = execGitCommand(repoPath, `blame -l ${ref} -- "${filePath}"`)
    const lines = blameOutput.split('\n')
    const chunks: any[] = []
    let currentChunk: any = null
    
    lines.forEach((line, index) => {
      const match = line.match(/^([a-f0-9]+)\s+\((.+?)\s+(\d{4}-\d{2}-\d{2})\s+(\d+:\d+:\d+)\s+([+-]\d+)\s+(\d+)\)\s+(.+)$/)
      if (match) {
        const [, sha, author, date, time, tz, lineNum, content] = match
        const commitDate = `${date} ${time} ${tz}`
        
        if (!currentChunk || currentChunk.commit.sha !== sha) {
          if (currentChunk) {
            chunks.push(currentChunk)
          }
          currentChunk = {
            startLine: index + 1,
            endLine: index + 1,
            commit: {
              sha,
              author: {
                name: author,
                email: '',
                date: commitDate
              },
              message: ''
            }
          }
        } else {
          currentChunk.endLine = index + 1
        }
      }
    })
    
    if (currentChunk) {
      chunks.push(currentChunk)
    }
    
    return chunks
  } catch (error: any) {
    console.error('Failed to get blame:', error.message)
    return []
  }
})

