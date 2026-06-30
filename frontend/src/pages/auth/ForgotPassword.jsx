import { useState } from 'react'
import { Link } from 'react-router-dom'
import API from '../../utils/api'
import './auth.css'

function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [sent, setSent] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            await API.post('/auth/forgot-password', { email })
            setSent(true)
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-left">
                <div className="auth-left-content">
                    <div className="auth-brand">
                        <div className="auth-brand-icon">
                            <svg viewBox="0 0 48 48" fill="currentColor" width="20" height="20">
                                <rect x="4" y="19" width="6" height="10" rx="2" opacity="0.9" />
                                <rect x="10" y="14" width="5" height="20" rx="2.5" />
                                <rect x="15" y="17" width="4" height="14" rx="2" opacity="0.85" />
                                <rect x="19" y="21" width="10" height="6" rx="3" />
                                <rect x="29" y="17" width="4" height="14" rx="2" opacity="0.85" />
                                <rect x="33" y="14" width="5" height="20" rx="2.5" />
                                <rect x="38" y="19" width="6" height="10" rx="2" opacity="0.9" />
                            </svg>
                        </div>
                        <span className="auth-brand-name">FitSync</span>
                    </div>
                    <h1 className="auth-left-title">Reset Your Password</h1>
                    <p className="auth-left-subtitle">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                </div>
            </div>

            <div className="auth-right">
                <div className="auth-form-card">
                    {!sent ? (
                        <>
                            <div className="auth-form-header">
                                <h2>Forgot password?</h2>
                                <p>No worries, we'll send you reset instructions.</p>
                            </div>

                            {error && (
                                <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="auth-form">
                                <div className="form-group">
                                    <label className="form-label">Email Address</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setError('') }}
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                                    {loading
                                        ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                        : 'Send Reset Link'
                                    }
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center" style={{ padding: '16px 0' }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
                            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Check your email</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                                If <strong>{email}</strong> is registered, a reset link has been sent.
                                Check your inbox and spam folder.
                            </p>
                            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 12 }}>
                                The link expires in 15 minutes.
                            </p>
                            <button
                                className="btn btn-secondary"
                                style={{ marginTop: 20 }}
                                onClick={() => { setSent(false); setEmail('') }}
                            >
                                Try a different email
                            </button>
                        </div>
                    )}

                    <div className="auth-bottom" style={{ marginTop: 24 }}>
                        <Link to="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--primary)', fontWeight: 500, fontSize: 14 }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                            Back to login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ForgotPassword