import { useState, useEffect } from 'react'
import { Eye, EyeOff, X } from 'lucide-react'
import './Settings.css'

interface Config {
  githubToken?: string
}

export const Settings: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [config, setConfig] = useState<Config | null>(null)
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const existingConfig = await window.electronAPI.config.read()
        setConfig(existingConfig || {})
        if (existingConfig?.githubToken) {
          setToken(existingConfig.githubToken)
        }
      } catch (err) {
        console.error('Failed to load config:', err)
        setConfig({})
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [])

  const handleSave = async () => {
    if (!token.trim()) {
      setError('GitHub token is required')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Test the token first
      const authResult = await window.electronAPI.github.auth(token.trim())

      if (!authResult.success) {
        setError(authResult.error || 'Invalid token')
        setSaving(false)
        return
      }

      // Save config
      const newConfig: Config = {
        ...config,
        githubToken: token.trim()
      }

      await window.electronAPI.config.write(newConfig)

      setSuccess(true)
      setConfig(newConfig)

      // Clear success message after 2 seconds
      setTimeout(() => {
        setSuccess(false)
        if (onClose) {
          onClose()
        }
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const handleClear = () => {
    setToken('')
    setError(null)
    setSuccess(false)
  }

  if (loading) {
    return (
      <div className="settings">
        <div className="settings-content">
          <div className="spinner"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="settings">
      <div className="settings-content">
        <div className="settings-header">
          <h1>Settings</h1>
          {onClose && (
            <button className="btn-close" onClick={onClose} title="Close">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="settings-section">
          <h2>GitHub Authentication</h2>
          <p className="section-description">
            Configure your GitHub Personal Access Token to access repositories.
          </p>

          <div className="form-group">
            <label htmlFor="github-token">GitHub Personal Access Token</label>
            <div className="token-input-wrapper">
              <input
                id="github-token"
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="token-input"
              />
              <button
                type="button"
                className="btn-toggle-visibility"
                onClick={() => setShowToken(!showToken)}
                title={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            <p className="field-help">
              Create a token at{' '}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/settings/tokens
              </a>
              {' '}with <code>repo</code> and <code>read:user</code> scopes
            </p>
          </div>

          {error && (
            <div className="alert alert-error">
              <strong>Error:</strong> {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <strong>Success!</strong> Configuration saved successfully.
            </div>
          )}

          <div className="settings-actions">
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || !token.trim()}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
            <button
              className="btn-secondary"
              onClick={handleClear}
              disabled={saving || !token}
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
