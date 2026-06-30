// ErrorBoundary.jsx
//
// Top-level safety net. Catches any unhandled React render error and shows
// a friendly error page instead of a blank white screen.
//
// Wrap the whole app (or a major section) in this:
//
//   <ErrorBoundary>
//     <App />
//   </ErrorBoundary>
//
// If something crashes during render, the user sees a styled fallback page
// with a "Try again" / "Go home" option instead of a broken app.

import { Component } from 'react'

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, info) {
        // Log for debugging — in prod you could ship this to Sentry/Datadog
        console.error('[ErrorBoundary] caught render crash:', error, info)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    handleGoHome = () => {
        this.setState({ hasError: false, error: null })
        window.location.href = '/'
    }

    render() {
        if (!this.state.hasError) return this.props.children

        return (
            <div className="error-boundary-page">
                <div className="error-boundary-card">
                    <div className="error-boundary-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <h1>Something went wrong</h1>
                    <p>
                        The page hit an unexpected error. This isn't your fault — it's
                        something we need to fix. Try reloading, and if it keeps happening,
                        contact support.
                    </p>
                    {this.state.error && (
                        <details className="error-boundary-details">
                            <summary>Technical details</summary>
                            <pre>{String(this.state.error)}</pre>
                        </details>
                    )}
                    <div className="error-boundary-actions">
                        <button className="btn btn-primary" onClick={this.handleReset}>
                            Try again
                        </button>
                        <button className="btn btn-outline" onClick={this.handleGoHome}>
                            Go to home
                        </button>
                    </div>
                </div>
            </div>
        )
    }
}
