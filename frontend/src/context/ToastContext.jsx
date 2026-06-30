// ToastContext.jsx
//
// Zero-dependency toast notification system.
// Provides a `useToast()` hook with success/error/warning/info methods.
//
// Usage (in any component):
//
//   import { useToast } from '../../context/ToastContext'
//   const toast = useToast()
//   toast.success('Payment recorded')
//   toast.error('Could not save')
//   toast.warning('Subscription expires in 3 days')
//   toast.info('Processing...')
//
// Each toast auto-dismisses after 4 seconds (or when user clicks the X).
// Multiple toasts stack at the bottom-right.

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import './Toast.css'

const ToastContext = createContext(null)

export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) {
        throw new Error('useToast must be used inside <ToastProvider>')
    }
    return ctx
}

const DEFAULT_DURATION = 4000

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])
    const nextId = useRef(1)

    const remove = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const show = useCallback((message, type = 'info', duration = DEFAULT_DURATION) => {
        const id = nextId.current++
        setToasts((prev) => [...prev, { id, message, type }])
        if (duration > 0) {
            setTimeout(() => remove(id), duration)
        }
        return id
    }, [remove])

    // Convenience methods
    const api = {
        show,
        dismiss: remove,
        success: (msg, d) => show(msg, 'success', d),
        error:   (msg, d) => show(msg, 'error', d ?? 6000),   // errors stay longer
        warning: (msg, d) => show(msg, 'warning', d),
        info:    (msg, d) => show(msg, 'info', d),
    }

    return (
        <ToastContext.Provider value={api}>
            {children}
            <ToastViewport toasts={toasts} onDismiss={remove} />
        </ToastContext.Provider>
    )
}

// ─── Viewport (renders the stack) ────────────────────────────────
function ToastViewport({ toasts, onDismiss }) {
    if (toasts.length === 0) return null

    return (
        <div className="toast-viewport" aria-live="polite" aria-atomic="false">
            {toasts.map((t) => (
                <Toast key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
            ))}
        </div>
    )
}

function Toast({ toast, onDismiss }) {
    return (
        <div className={`toast toast-${toast.type}`} role="status">
            <div className="toast-icon">
                {ICONS[toast.type] || ICONS.info}
            </div>
            <div className="toast-message">{toast.message}</div>
            <button
                className="toast-close"
                onClick={onDismiss}
                aria-label="Dismiss notification"
                type="button"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
        </div>
    )
}

// ─── Icon set (simple inline SVGs, stroke-based) ─────────────────
const ICONS = {
    success: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    error: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    ),
    warning: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    info: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
}
