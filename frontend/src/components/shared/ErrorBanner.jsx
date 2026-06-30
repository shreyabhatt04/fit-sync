// ErrorBanner.jsx
//
// Inline error banner — shown inside pages/forms when something fails
// that should stay visible on screen, not auto-dismiss.
//
// Use for:
//   - Form submission errors (instead of toast for things the user
//     should see WHILE they fix it)
//   - Page-level "couldn't load data — try again" messages
//
// For transient messages (success/info), use toast instead.
//
// Usage:
//
//   const [error, setError] = useState('')
//   ...
//   {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}
//
//   // Or with retry:
//   {error && (
//     <ErrorBanner
//       message="Failed to load payments"
//       onRetry={() => fetchPayments()}
//     />
//   )}

export default function ErrorBanner({
    message,
    onDismiss = null,
    onRetry = null,
    variant = 'error',    // 'error' | 'warning' | 'info'
}) {
    if (!message) return null

    return (
        <div className={`error-banner error-banner-${variant}`} role="alert">
            <div className="error-banner-icon">
                {variant === 'warning' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                ) : variant === 'info' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                )}
            </div>
            <div className="error-banner-text">{message}</div>
            <div className="error-banner-actions">
                {onRetry && (
                    <button
                        type="button"
                        className="error-banner-btn"
                        onClick={onRetry}
                    >
                        Retry
                    </button>
                )}
                {onDismiss && (
                    <button
                        type="button"
                        className="error-banner-close"
                        onClick={onDismiss}
                        aria-label="Dismiss"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    )
}
