import { useState } from 'react'
import { Sparkles, Send } from 'lucide-react'
import './AIPanel.css'

export const AIPanel: React.FC = () => {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || loading) return

    setLoading(true)
    // TODO: Implement AI query
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="ai-panel">

      <div className="ai-panel-placeholder">
        <p>AI assistant coming soon</p>
        <p className="ai-panel-placeholder-subtitle">
          This feature will provide AI-powered explanations and suggestions for your code changes.
        </p>
      </div>
    </div>
  )
}
