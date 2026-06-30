import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import './auth.css'

function Signup() {
    const navigate = useNavigate()
    // Note: no useAuth().login here — after Batch 23, signup never
    // auto-logs-in. Every new user goes through OTP and approval first.
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        gymName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        agreeTerms: false,
    })
    const [showPass, setShowPass] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)
    const [apiError, setApiError] = useState('')
    // After a successful submit, show a "thanks, awaiting approval" screen
    // instead of trying to log in (which won't work — admin is pending).
    const [submitted, setSubmitted] = useState(null)

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
        setErrors({ ...errors, [name]: '' })
        setApiError('')
    }

    const validate = () => {
        const e = {}
        if (!form.firstName.trim()) e.firstName = 'First name is required'
        if (!form.lastName.trim())  e.lastName  = 'Last name is required'
        if (!form.gymName.trim())   e.gymName   = 'Gym name is required'
        if (!form.email.trim())     e.email     = 'Email is required'
        else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
        if (!form.phone.trim())     e.phone     = 'Phone is required'
        else if (!/^\d{10}$/.test(form.phone))     e.phone = 'Enter a valid 10-digit number'
        if (!form.password)                     e.password = 'Password is required'
        else if (form.password.length < 6)      e.password = 'Minimum 6 characters'
        if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
        if (!form.agreeTerms)                   e.agreeTerms = 'You must agree to the terms'
        return e
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length > 0) { setErrors(errs); return }

        setLoading(true)
        try {
            const res = await authService.register({
                firstName: form.firstName,
                lastName:  form.lastName,
                gymName:   form.gymName,
                email:     form.email,
                phone:     form.phone,
                password:  form.password,
            })
            // After Batch 23 the backend always sets requiresApproval AND
            // emailVerificationRequired for new signups. Route the user
            // straight to the OTP entry screen.
            const body = res
            if (body.requiresApproval) {
                navigate(`/verify-email?email=${encodeURIComponent(form.email)}`)
                return
            }
            // Fallback for any unexpected response shape — show the
            // holding screen rather than trying to auto-login (we no
            // longer have a token to log in with).
            setSubmitted(body.data || { email: form.email, gymName: form.gymName })
        } catch (err) {
            setApiError(err.response?.data?.message || 'Registration failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const getPasswordStrength = () => {
        const p = form.password
        if (!p) return null
        if (p.length < 6) return { label: 'Weak', color: 'var(--danger)', width: '25%' }
        if (p.length < 8 || !/[0-9]/.test(p)) return { label: 'Fair', color: 'var(--warning)', width: '50%' }
        if (!/[A-Z]/.test(p) || !/[^a-zA-Z0-9]/.test(p)) return { label: 'Good', color: 'var(--primary)', width: '75%' }
        return { label: 'Strong', color: 'var(--success)', width: '100%' }
    }

    const strength = getPasswordStrength()

    // Post-submit success screen — shown when register returns
    // requiresApproval (gym admin must wait for superadmin to approve).
    if (submitted) {
        return (
            <div className="auth-page">
                <div className="auth-right" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                        background: '#fff',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: '32px 28px',
                        maxWidth: 480,
                        textAlign: 'center',
                    }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: '50%',
                            background: '#fffbeb', color: '#92400e',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 28, margin: '0 auto 16px',
                        }}>⏳</div>
                        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
                            Registration submitted
                        </h2>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 16 }}>
                            Thanks for signing up <strong>{submitted.gymName || form.gymName}</strong>!
                            A FitSync administrator will review your account and you'll be able
                            to log in once approved. We've sent a confirmation to <strong>{submitted.email || form.email}</strong>.
                        </p>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                            This usually takes less than a business day.
                        </p>
                        <Link to="/login" className="btn btn-primary">
                            Go to login page
                        </Link>
                    </div>
                </div>
            </div>
        )
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
                    <h1 className="auth-left-title">Run your gym in one place</h1>
                    <p className="auth-left-subtitle">
                        Start your 14-day free trial — no credit card required.
                    </p>
                    <div className="auth-features">
                        {[
                            { icon: '🎯', label: 'Member Management', desc: 'Track every member in one dashboard' },
                            { icon: '📊', label: 'Attendance & Reports', desc: 'Know what\'s working at a glance' },
                            { icon: '💳', label: 'Easy Payments', desc: 'Invoices, dues and renewals handled' },
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
                <div className="auth-form-card" style={{ maxWidth: 480 }}>
                    <div className="auth-form-header">
                        <h2>Create your gym account</h2>
                        <p>Set up FitSync for your gym in under a minute</p>
                    </div>

                    {apiError && (
                        <div className="alert alert-danger">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            {apiError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Gym / Business Name *</label>
                            <input name="gymName"
                                className={`form-input ${errors.gymName ? 'input-error' : ''}`}
                                placeholder="e.g. PowerHouse Gym"
                                value={form.gymName} onChange={handleChange} />
                            {errors.gymName && <p className="form-error">{errors.gymName}</p>}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">First Name *</label>
                                <input name="firstName"
                                    className={`form-input ${errors.firstName ? 'input-error' : ''}`}
                                    placeholder="First name"
                                    value={form.firstName} onChange={handleChange} />
                                {errors.firstName && <p className="form-error">{errors.firstName}</p>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name *</label>
                                <input name="lastName"
                                    className={`form-input ${errors.lastName ? 'input-error' : ''}`}
                                    placeholder="Last name"
                                    value={form.lastName} onChange={handleChange} />
                                {errors.lastName && <p className="form-error">{errors.lastName}</p>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email Address *</label>
                            <input name="email" type="email"
                                className={`form-input ${errors.email ? 'input-error' : ''}`}
                                placeholder="you@example.com"
                                value={form.email} onChange={handleChange} />
                            {errors.email && <p className="form-error">{errors.email}</p>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Phone Number *</label>
                            <input name="phone"
                                className={`form-input ${errors.phone ? 'input-error' : ''}`}
                                placeholder="10-digit number"
                                value={form.phone} onChange={handleChange} maxLength={10} />
                            {errors.phone && <p className="form-error">{errors.phone}</p>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password *</label>
                            <div className="input-password-wrapper">
                                <input name="password" type={showPass ? 'text' : 'password'}
                                    className={`form-input ${errors.password ? 'input-error' : ''}`}
                                    placeholder="Min 6 characters"
                                    value={form.password} onChange={handleChange} />
                                <button type="button" className="password-toggle" onClick={() => setShowPass(!showPass)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        {showPass
                                            ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><line x1="1" y1="1" x2="23" y2="23" /></>
                                            : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                                        }
                                    </svg>
                                </button>
                            </div>
                            {strength && (
                                <div className="password-strength">
                                    <div className="strength-track">
                                        <div className="strength-fill" style={{ width: strength.width, background: strength.color }} />
                                    </div>
                                    <span className="strength-label" style={{ color: strength.color }}>{strength.label}</span>
                                </div>
                            )}
                            {errors.password && <p className="form-error">{errors.password}</p>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirm Password *</label>
                            <div className="input-password-wrapper">
                                <input name="confirmPassword" type={showConfirm ? 'text' : 'password'}
                                    className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
                                    placeholder="Re-enter password"
                                    value={form.confirmPassword} onChange={handleChange} />
                                <button type="button" className="password-toggle" onClick={() => setShowConfirm(!showConfirm)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        {showConfirm
                                            ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><line x1="1" y1="1" x2="23" y2="23" /></>
                                            : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                                        }
                                    </svg>
                                </button>
                            </div>
                            {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
                        </div>

                        <div className="form-group">
                            <label className="checkbox-label">
                                <input type="checkbox" name="agreeTerms"
                                    checked={form.agreeTerms} onChange={handleChange} />
                                <span>I agree to the <a href="#" className="auth-link">Terms</a> and <a href="#" className="auth-link">Privacy Policy</a></span>
                            </label>
                            {errors.agreeTerms && <p className="form-error">{errors.agreeTerms}</p>}
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                            {loading
                                ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                : 'Start Free Trial'
                            }
                        </button>
                    </form>

                    <div className="auth-bottom">
                        Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
                    </div>
                    <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 12 }}>
                        Gym member? Ask your gym admin for an invite link.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Signup
