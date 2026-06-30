import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import API from '../../utils/api'
import './auth.css'

function ResetPassword() {
    const { token } = useParams()
    const navigate = useNavigate()

    const [form, setForm] = useState({ password: '', confirm: '' })
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (form.password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }
        if (form.password !== form.confirm) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)
        try {
            await API.put(`/auth/reset-password/${token}`, { password: form.password })
            setSuccess(true)
            // Redirect to login after 3 seconds
            setTimeout(() => navigate('/login'), 3000)
        } catch (err) {
            setError(err.response?.data?.message || 'Reset link is invalid or has expired.')
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
                    <h1 className="auth-left-title">Set a New Password</h1>
                    <p className="auth-left-subtitle">
                        Choose a strong password you haven't used before.
                    </p>
                </div>
            </div>

            <div className="auth-right">
                <div className="auth-form-card">
                    {success ? (
                        <div className="text-center" style={{ padding: '16px 0' }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Password reset!</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                                Your password has been updated successfully.
                                Redirecting you to login…
                            </p>
                            <Link to="/login" className="btn btn-primary" style={{ marginTop: 20, display: 'inline-block' }}>
                                Go to Login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="auth-form-header">
                                <h2>Set new password</h2>
                                <p>Must be at least 6 characters.</p>
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
                                    <label className="form-label">New Password</label>
                                    <div className="input-password-wrapper">
                                        <input
                                            type={showPass ? 'text' : 'password'}
                                            className="form-input"
                                            placeholder="Min. 6 characters"
                                            value={form.password}
                                            onChange={(e) => { setForm({ ...form, password: e.target.value }); setError('') }}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setShowPass(!showPass)}
                                        >
                                            {showPass ? (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                                    <line x1="1" y1="1" x2="23" y2="23" />
                                                </svg>
                                            ) : (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Confirm Password</label>
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        className="form-input"
                                        placeholder="Repeat your new password"
                                        value={form.confirm}
                                        onChange={(e) => { setForm({ ...form, confirm: e.target.value }); setError('') }}
                                        required
                                    />
                                </div>

                                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                                    {loading
                                        ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                        : 'Reset Password'
                                    }
                                </button>
                            </form>
                        </>
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

export default ResetPassword