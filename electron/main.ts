import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { Octokit } from '@octokit/rest'
import fs from 'fs'
import os from 'os'

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
      files: data.files?.map(file => ({
        path: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        oldSha: file.status !== 'added' ? data.base_commit.sha : undefined,
        newSha: file.status !== 'deleted' ? data.commits[data.commits.length - 1]?.sha : undefined,
        patch: file.patch
      })) || [],
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

