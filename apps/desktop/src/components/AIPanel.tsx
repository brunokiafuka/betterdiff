import { useState, useEffect } from 'react'
import { X, Sparkles, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { llmService } from '../services/llm'
import { Explanation } from '../types'
import './AIPanel.css'

interface AIPanelProps {
  onClose: () => void
}

export const AIPanel: React.FC<AIPanelProps> = ({ onClose }) => {
  const { currentComparison, selectedFile, baseRef, headRef } = useAppStore()
  const [explanation, setExplanation] = useState<Explanation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateExplanation = async () => {
    if (!currentComparison || !selectedFile) {
      setError('Please select a file to analyze')
      return
    }

    setLoading(true)
    setError(null)
    setExplanation(null)

    try {
      const diff = selectedFile.patch || ''
      const commitMessages = currentComparison.commits
        .slice(0, 5)
        .map(c => c.message)
        .filter(Boolean)

      const explanation = await llmService.explainChange({
        diff,
        commitMessages,
        filePath: selectedFile.path
      })

      setExplanation(explanation)
    } catch (err: any) {
      console.error('Failed to generate explanation:', err)
      setError(err.message || 'Failed to generate AI explanation')
    } finally {
      setLoading(false)
    }
  }

  // Auto-generate when panel opens if we have context
  useEffect(() => {
    if (currentComparison && selectedFile && !explanation && !loading && !error) {
      generateExplanation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentComparison, selectedFile])

  const hasContext = currentComparison && selectedFile

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <div className="ai-panel-title">
          <Sparkles size={16} />
          <h3>AI Analysis</h3>
        </div>
        <button className="ai-panel-close" onClick={onClose} title="Close">
          <X size={18} />
        </button>
      </div>

      <div className="ai-panel-content">
        {!hasContext ? (
          <div className="ai-panel-empty">
            <AlertCircle size={32} />
            <p>Select a file to analyze</p>
          </div>
        ) : (
          <>
            <div className="ai-context-info">
              <div className="context-item">
                <span className="context-label">File:</span>
                <span className="context-value">{selectedFile.path}</span>
              </div>
              <div className="context-item">
                <span className="context-label">Refs:</span>
                <span className="context-value">
                  {baseRef?.name} → {headRef?.name}
                </span>
              </div>
            </div>

            {loading && (
              <div className="ai-loading">
                <Loader2 size={24} className="spinner" />
                <p>Analyzing with AI...</p>
              </div>
            )}

            {error && (
              <div className="ai-error">
                <AlertCircle size={20} />
                <p>{error}</p>
                <button className="ai-retry-btn" onClick={generateExplanation}>
                  Retry
                </button>
              </div>
            )}

            {explanation && (
              <div className="ai-explanation">
                {explanation.summary && explanation.summary.length > 0 && (
                  <div className="explanation-section">
                    <h4>Summary</h4>
                    <ul>
                      {explanation.summary.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {explanation.behavioralChange && (
                  <div className="explanation-section">
                    <h4>Behavioral Changes</h4>
                    <p>{explanation.behavioralChange}</p>
                  </div>
                )}

                {explanation.risks && explanation.risks.length > 0 && (
                  <div className="explanation-section">
                    <h4>Potential Risks</h4>
                    <ul className="risks-list">
                      {explanation.risks.map((risk, idx) => (
                        <li key={idx}>
                          <AlertCircle size={14} />
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {explanation.testsToRun && explanation.testsToRun.length > 0 && (
                  <div className="explanation-section">
                    <h4>Tests to Run</h4>
                    <ul className="tests-list">
                      {explanation.testsToRun.map((test, idx) => (
                        <li key={idx}>
                          <CheckCircle2 size={14} />
                          <span>{test}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {explanation.questions && explanation.questions.length > 0 && (
                  <div className="explanation-section">
                    <h4>Questions</h4>
                    <ul className="questions-list">
                      {explanation.questions.map((question, idx) => (
                        <li key={idx}>{question}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="ai-actions">
                  <button className="ai-regenerate-btn" onClick={generateExplanation}>
                    <Sparkles size={12} />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
