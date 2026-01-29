import { useEffect } from 'react'
import { useUiStore } from '../stores/uiStore'
import './GlobalFeedback.css'

export const GlobalFeedback: React.FC = () => {
  const { actions, toasts, removeToast } = useUiStore()

  const activeAction = Object.values(actions).find((action) => action.loading)

  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((toast) =>
      setTimeout(() => {
        removeToast(toast.id)
      }, 4000)
    )
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [toasts, removeToast])

  return (
    <>
      {activeAction && (
        <div className="global-loading">
          <div className="spinner" />
          <span>{activeAction.message || 'Working...'}</span>
        </div>
      )}

      {toasts.length > 0 && (
        <div className="global-toasts">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              <span>{toast.message}</span>
              <button
                className="toast-close"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
