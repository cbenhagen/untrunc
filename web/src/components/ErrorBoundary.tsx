import { Component } from 'react'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="error-boundary">
          <div className="error-content">
            <ErrorIcon />
            <h2>Something went wrong</h2>
            <p className="error-message">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button className="btn btn-primary" onClick={this.handleReset}>
              Try Again
            </button>
          </div>

          <style>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 400px;
              padding: var(--space-8);
            }

            .error-content {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: var(--space-4);
              text-align: center;
              max-width: 400px;
            }

            .error-content svg {
              width: 64px;
              height: 64px;
              color: var(--red-400);
            }

            .error-content h2 {
              font-size: 1.5rem;
              color: var(--text-primary);
            }

            .error-message {
              color: var(--text-secondary);
              font-family: var(--font-mono);
              font-size: 0.875rem;
              padding: var(--space-3);
              background: var(--bg-tertiary);
              border-radius: var(--radius-md);
              word-break: break-word;
            }
          `}</style>
        </div>
      )
    }

    return this.props.children
  }
}

function ErrorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

