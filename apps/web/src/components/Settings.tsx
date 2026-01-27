import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { X, Trash2, AlertTriangle } from 'lucide-react'
import { useDeleteAccount } from '../services/github'
import { useAuthActions } from '@convex-dev/auth/react'
import './Settings.css'
import { track } from '../services/analytics'

export const Settings: React.FC = () => {
  const navigate = useNavigate()
  const deleteAccount = useDeleteAccount()
  const { signOut } = useAuthActions()
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    track('settings_viewed', { surface: 'web' })
  }, [])

  const handleClose = () => {
    // Check if there's browser history to go back to
    // window.history.length > 1 means there's at least one previous page
    if (window.history.length > 1 && document.referrer) {
      // Go back to previous page
      window.history.back()
    } else {
      // No history or direct access, navigate to repos
      navigate({ to: '/repos' })
    }
  }

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm')
      return
    }

    setDeleting(true)
    setError(null)

    try {
      await deleteAccount()
      await signOut()

      navigate({ to: '/' })
    } catch (err: any) {
      setError(err.message || 'Failed to delete account')
      setDeleting(false)
    }
  }

  return (
    <div className="settings">
      <div className="settings-content">
        <div className="settings-header">
          <h1>Settings</h1>
          <button className="btn-close" onClick={handleClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="settings-section">
          <h2>Account Management</h2>
          <p className="section-description">
            Manage your account settings and data.
          </p>

          {!showConfirm ? (
            <>
              <div className="danger-zone">
                <div className="danger-zone-header">
                  <AlertTriangle size={18} />
                  <h3>Danger Zone</h3>
                </div>
                <p className="danger-zone-description">
                  Once you delete your account, there is no going back. This will permanently delete your account and all associated data.
                </p>
                <button
                  className="btn-danger"
                  onClick={() => setShowConfirm(true)}
                  disabled={deleting}
                >
                  <Trash2 size={18} />
                  Delete Account
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="danger-zone danger-zone-confirm">
                <div className="danger-zone-header">
                  <AlertTriangle size={18} />
                  <h3>Confirm Account Deletion</h3>
                </div>
                <p className="danger-zone-description">
                  This action cannot be undone. This will permanently delete your account and remove all of your data from our servers.
                </p>
                <div className="form-group">
                  <label htmlFor="confirm-delete">
                    Type <strong>DELETE</strong> to confirm:
                  </label>
                  <input
                    id="confirm-delete"
                    type="text"
                    value={confirmText}
                    onChange={(e) => {
                      setConfirmText(e.target.value)
                      setError(null)
                    }}
                    placeholder="DELETE"
                    className="confirm-input"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="alert alert-error">
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-actions">
                  <button
                    className="btn-danger"
                    onClick={handleDeleteAccount}
                    disabled={deleting || confirmText !== 'DELETE'}
                  >
                    {deleting ? 'Deleting...' : (
                      <>
                        <Trash2 size={18} />
                        Permanently Delete Account
                      </>
                    )}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setShowConfirm(false)
                      setConfirmText('')
                      setError(null)
                    }}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
