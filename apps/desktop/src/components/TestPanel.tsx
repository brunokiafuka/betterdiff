import { useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { githubService } from '../services/github'
import './TestPanel.css'

export const TestPanel: React.FC = () => {
  const [token, setToken] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState('')
  const [repos, setRepos] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isElectron, setIsElectron] = useState(false)
  
  const { currentRepo, setRepo, setRefs, setComparison } = useAppStore()
  const [selectedBase, setSelectedBase] = useState('')
  const [selectedHead, setSelectedHead] = useState('')

  // Check if running in Electron
  useState(() => {
    setIsElectron(typeof window !== 'undefined' && window.electronAPI !== undefined)
  })

  const handleAuth = async () => {
    if (!token.trim()) {
      setError('Please enter a GitHub token')
      return
    }
    
    if (!isElectron) {
      setError('Electron is not running. This app needs Electron to work properly. See TESTING.md for browser testing options.')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const result = await window.electronAPI.github.auth(token)
      if (result.success) {
        setIsAuthenticated(true)
        setUser(result.user || 'User')
        
        // Fetch repos
        const repoList = await window.electronAPI.github.fetchRepos()
        setRepos(repoList)
      } else {
        setError(result.error || 'Authentication failed')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectRepo = async (repo: any) => {
    setLoading(true)
    setError('')
    
    try {
      setRepo(repo)
      
      // Fetch branches
      const branchList = await window.electronAPI.github.listBranches(repo.fullName)
      setBranches(branchList)
      
      // Set default base ref
      if (branchList.length > 0) {
        const defaultBranch = branchList.find(b => b.name === repo.defaultBranch) || branchList[0]
        setSelectedBase(defaultBranch.name)
        setRefs(defaultBranch, defaultBranch)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCompare = async () => {
    if (!currentRepo || !selectedBase || !selectedHead) {
      setError('Please select repo and both refs')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const comparison = await githubService.compareRefs(
        currentRepo,
        branches.find(b => b.name === selectedBase)!,
        branches.find(b => b.name === selectedHead)!
      )
      
      setComparison(comparison)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Quick test with a known repo
  const quickTest = async () => {
    setLoading(true)
    setError('')
    
    try {
      // Use React repo as test
      const testRepo = {
        id: 'test',
        owner: 'facebook',
        name: 'react',
        fullName: 'facebook/react',
        defaultBranch: 'main'
      }
      
      setRepo(testRepo)
      
      const branchList = await window.electronAPI.github.listBranches(testRepo.fullName)
      setBranches(branchList)
      
      if (branchList.length >= 2) {
        setSelectedBase(branchList[0].name)
        setSelectedHead(branchList[1].name)
        
        const comparison = await githubService.compareRefs(
          testRepo,
          branchList[0],
          branchList[1]
        )
        
        setComparison(comparison)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="test-panel">
      <h2>🧪 Test Setup</h2>
      
      {!isElectron && (
        <div className="warning-box">
          <h3>⚠️ Electron Not Running</h3>
          <p>
            This app is designed to run in Electron. The GitHub API integration requires the Electron main process.
          </p>
          <p>
            <strong>To fix:</strong> See the <code>TESTING.md</code> file for instructions on resolving the Electron build issue.
          </p>
          <p className="help-text">
            The issue is an ES modules compatibility problem between Electron and Vite. 
            Quick fix: install <code>electron-vite</code> or adjust the build configuration.
          </p>
        </div>
      )}
      
      {!isAuthenticated ? (
        <div className="auth-section">
          <p>Enter a GitHub Personal Access Token to test:</p>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_..."
            className="token-input"
            disabled={!isElectron}
          />
          <button onClick={handleAuth} disabled={loading || !isElectron} className="btn-primary">
            {loading ? 'Authenticating...' : 'Authenticate'}
          </button>
          <p className="help-text">
            Get a token from{' '}
            <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer">
              GitHub Settings
            </a>{' '}
            (needs 'repo' scope)
          </p>
        </div>
      ) : (
        <div className="authenticated-section">
          <p className="success">✓ Authenticated as {user}</p>
          
          <div className="section">
            <h3>1. Select Repository</h3>
            <select onChange={(e) => {
              const repo = repos.find(r => r.fullName === e.target.value)
              if (repo) handleSelectRepo(repo)
            }} className="select-input">
              <option value="">Choose a repo...</option>
              {repos.map(repo => (
                <option key={repo.id} value={repo.fullName}>
                  {repo.fullName}
                </option>
              ))}
            </select>
            
            <button onClick={quickTest} className="btn-secondary">
              Quick Test (facebook/react)
            </button>
          </div>
          
          {currentRepo && branches.length > 0 && (
            <div className="section">
              <h3>2. Select Refs to Compare</h3>
              <div className="ref-selectors">
                <div>
                  <label>Base:</label>
                  <select value={selectedBase} onChange={(e) => setSelectedBase(e.target.value)} className="select-input">
                    {branches.map(branch => (
                      <option key={branch.name} value={branch.name}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Head:</label>
                  <select value={selectedHead} onChange={(e) => setSelectedHead(e.target.value)} className="select-input">
                    <option value="">Select head ref...</option>
                    {branches.map(branch => (
                      <option key={branch.name} value={branch.name}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button 
                onClick={handleCompare} 
                disabled={loading || !selectedHead}
                className="btn-primary"
              >
                {loading ? 'Comparing...' : 'Compare'}
              </button>
            </div>
          )}
        </div>
      )}
      
      {error && <div className="error">{error}</div>}
    </div>
  )
}
