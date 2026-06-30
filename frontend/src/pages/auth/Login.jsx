import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { authService } from '../../services/authService'
import './auth.css'

function Login() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [form, setForm] = useState({ email: '', password: '' })
    const [showPass, setShowPass] = useState(false)
    const [error, setError] = useState('')
    const [errorCode, setErrorCode] = useState('')
    const [loading, setLoading] = useState(false)

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value })
        setError('')
        setErrorCode('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setErrorCode('')
        try {
            const res = await authService.login(form.email, form.password)
            // Backend returns { success, data: { ...user, token: '...' } }
            const userData = res.data
            const token    = res.data?.token
            login(userData, token)

            const role = userData?.role
            if (role === 'superadmin')      navigate('/superadmin/dashboard')
            else if (role === 'admin')      navigate('/admin/dashboard')
            else if (role === 'staff')      navigate('/admin/dashboard')
            else                             navigate('/customer/dashboard')
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.')
            setErrorCode(err.response?.data?.code || '')
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
                                <rect x="4"  y="19" width="6"  height="10" rx="2" opacity="0.9" />
                                <rect x="10" y="14" width="5"  height="20" rx="2.5" />
                                <rect x="15" y="17" width="4"  height="14" rx="2" opacity="0.85" />
                                <rect x="19" y="21" width="10" height="6"  rx="3" />
                                <rect x="29" y="17" width="4"  height="14" rx="2" opacity="0.85" />
                                <rect x="33" y="14" width="5"  height="20" rx="2.5" />
                                <rect x="38" y="19" width="6"  height="10" rx="2" opacity="0.9" />
                            </svg>
                        </div>
                        <span className="auth-brand-name">FitSync</span>
                    </div>
                    <h1 className="auth-left-title">Manage Your Gym Smarter</h1>
                    <p className="auth-left-subtitle">
                        Complete gym management — members, payments, attendance, reports and more.
                    </p>
                    <div className="auth-features">
                        {[
                            { icon: '👥', label: 'Member Management', desc: 'Track all your gym members' },
                            { icon: '💳', label: 'Payment Tracking',   desc: 'Never miss a payment' },
                            { icon: '📊', label: 'Business Reports',   desc: 'Insights at a glance' },
                        ].map((f) => (
                            <div key={f.label} className="auth-feature-item">
                                <span className="auth-feature-icon">{f.icon}</span>
                                <div>
                                    <p className="auth-feature-label">{f.label}</p>
                                    <p className="auth-feature-desc">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="auth-right">
                <div className="auth-form-card">
                    <div className="auth-form-header">
                        <h2>Welcome back</h2>
                        <p>Sign in to your account to continue</p>
                    </div>

                    {error && errorCode === 'PENDING_APPROVAL' && (
                        <div style={{
                            padding: '12px 14px',
                            background: '#fffbeb',
                            border: '1px solid #fde68a',
                            borderRadius: 8,
                            color: '#92400e',
                            fontSize: 13.5,
                            display: 'flex', gap: 10, alignItems: 'flex-start',
                            marginBottom: 12,
                        }}>
                            <span style={{ fontSize: 16, lineHeight: '20px' }}>⏳</span>
                            <div>
                                <strong style={{ display: 'block', marginBottom: 2 }}>Account pending approval</strong>
                                {error}
                            </div>
                        </div>
                    )}

                    {error && errorCode === 'ACCOUNT_REJECTED' && (
                        <div style={{
                            padding: '12px 14px',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: 8,
                            color: '#991b1b',
                            fontSize: 13.5,
                            display: 'flex', gap: 10, alignItems: 'flex-start',
                            marginBottom: 12,
                        }}>
                            <span style={{ fontSize: 16, lineHeight: '20px' }}>🚫</span>
                            <div>
                                <strong style={{ display: 'block', marginBottom: 2 }}>Account not approved</strong>
                                {error}
                            </div>
                        </div>
                    )}

                    {error && !['PENDING_APPROVAL', 'ACCOUNT_REJECTED'].includes(errorCode) && (
                        <div className="alert alert-danger">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                            <input type="email" name="email" className="form-input"
                                placeholder="you@example.com" value={form.email}
                                onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div className="input-password-wrapper">
                                <input type={showPass ? 'text' : 'password'} name="password"
                                    className="form-input" placeholder="Enter your password"
                                    value={form.password} onChange={handleChange} required />
                                <button type="button" className="password-toggle"
                                    onClick={() => setShowPass(!showPass)}>
                                    {showPass ? (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="auth-form-options">
                            <label className="checkbox-label">
                                <input type="checkbox" /> Remember me
                            </label>
                            <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
                        </div>
                        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                            {loading
                                ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                : 'Sign In'
                            }
                        </button>
                    </form>

                    <div className="auth-bottom">
                        Don't have an account?{' '}
                        <Link to="/signup" className="auth-link">Sign up</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login
