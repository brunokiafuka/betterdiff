import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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
  // Store token securely (will implement with electron-store or keytar)
  return { success: true }
})

ipcMain.handle('github:fetchRepos', async (_event) => {
  // Will implement with Octokit
  return []
})

ipcMain.handle('github:compareRefs', async (_event, repo: string, base: string, head: string) => {
  // Will implement with Octokit
  return { files: [], commits: [] }
})

ipcMain.handle('github:getBlame', async (_event, repo: string, ref: string, path: string) => {
  // Will implement with GitHub GraphQL
  return []
})

ipcMain.handle('llm:explain', async (_event, context: any) => {
  // Will implement LLM integration
  return { summary: '', risks: [], tests: [] }
})
