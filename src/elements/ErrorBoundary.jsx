import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Keep it visible in console for debugging.
    console.error('UI crashed:', error, errorInfo)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const message = this.state.error?.message || String(this.state.error || 'Unknown error')
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: '#fff' }}>
        <h2 style={{ margin: 0, marginBottom: 12 }}>Something went wrong</h2>
        <div style={{ opacity: 0.85, marginBottom: 12 }}>The UI crashed with a runtime error:</div>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            background: 'rgba(0,0,0,0.35)',
            padding: 12,
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          {message}
        </pre>
        <div style={{ opacity: 0.7 }}>
          Check the browser console for the full stack trace.
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
