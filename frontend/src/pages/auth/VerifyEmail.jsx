// frontend/src/pages/auth/VerifyEmail.jsx — Batch 22 (guide feedback #8)
//
// Public page for entering the OTP that was emailed during signup. Reaches
// the user via /verify-email?email=... — Signup.jsx redirects here when the
// register response sets emailVerificationRequired: true.
//
// On success we don't log the user in — they still need admin approval per
// the rest of the auth flow. We just show a "verified, awaiting approval"
// confirmation and link them to /login.

import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import API from '../../utils/api'

export default function VerifyEmail() {
    const [searchParams] = useSearchParams()
    const emailFromUrl = searchParams.get('email') || ''

    // If we landed here directly without an email param (e.g. user
    // bookmarked the URL), let them type one in. Otherwise lock the field.
    const [email, setEmail]   = useState(emailFromUrl)
    const [otp, setOtp]       = useState('')
    const [loading, setLoading] = useState(false)
    const [resending, setResending] = useState(false)
    const [error, setError]   = useState('')
    const [verified, setVerified] = useState(false)

    // Cooldown so users can't spam the resend button — keeps our SMTP quota safe
    const [cooldown, setCooldown] = useState(0)
    const cooldownTimer = useRef(null)
    useEffect(() => {
        if (cooldown <= 0) return
        cooldownTimer.current = setTimeout(() => setCooldown(c => c - 1), 1000)
        return () => clearTimeout(cooldownTimer.current)
    }, [cooldown])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (!email || !otp) {
            setError('Please enter your email and the verification code.')
            return
        }
        setLoading(true)
        try {
            await API.post('/auth/verify-otp-public', { email, otp })
            setVerified(true)
        } catch (err) {
            setError(err.response?.data?.message || 'Could not verify code.')
        } finally {
            setLoading(false)
        }
    }

    const handleResend = async () => {
        if (!email) {
            setError('Enter your email first.')
            return
        }
        setResending(true)
        setError('')
        try {
            await API.post('/auth/resend-otp-public', { email })
            setCooldown(30)   // 30s before user can resend again
        } catch (err) {
            setError(err.response?.data?.message || 'Could not resend code.')
        } finally {
            setResending(false)
        }
    }

    if (verified) {
        return (
            <div className="auth-page">
                <div className="auth-right" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                        background: '#fff',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: '32px 28px',
                        maxWidth: 460,
                        textAlign: 'center',
                    }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: '50%',
                            background: '#f0fdf4', color: '#166534',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 28, margin: '0 auto 14px',
                        }}>✓</div>
                        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
                            Email verified
                        </h2>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 16 }}>
                            Thanks for confirming your email. An administrator will now review
                            your account and you'll be able to log in once approved.
                        </p>
                        <Link to="/login" className="btn btn-primary">Go to login page</Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-page">
            <div className="auth-right">
                <div className="auth-form-wrapper" style={{ maxWidth: 440 }}>
                    <h1 className="auth-title" style={{ marginBottom: 6 }}>Verify your email</h1>
                    <p className="auth-subtitle" style={{ marginBottom: 24 }}>
                        We sent a 6-digit code to your email. Enter it below to confirm
                        ownership before your account can be approved.
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                disabled={!!emailFromUrl}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Verification code</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                className="form-input"
                                style={{ letterSpacing: '0.4em', textAlign: 'center', fontSize: 18 }}
                                maxLength={6}
                                value={otp}
                                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                placeholder="123456"
                                autoFocus
                                required
                            />
                        </div>

                        {error && (
                            <div style={{
                                padding: '10px 12px',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: 6,
                                color: '#991b1b',
                                fontSize: 13,
                                marginBottom: 12,
                            }}>{error}</div>
                        )}

                        <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                            {loading
                                ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                : 'Verify email'}
                        </button>
                    </form>

                    <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                        Didn't receive it?{' '}
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resending || cooldown > 0}
                            style={{
                                background: 'transparent', border: 'none', padding: 0,
                                color: 'var(--primary, #10B981)', fontWeight: 500,
                                cursor: (resending || cooldown > 0) ? 'not-allowed' : 'pointer',
                                opacity: (resending || cooldown > 0) ? 0.5 : 1,
                            }}
                        >
                            {resending
                                ? 'Sending…'
                                : cooldown > 0
                                    ? `Resend in ${cooldown}s`
                                    : 'Resend code'}
                        </button>
                    </div>

                    <div className="auth-bottom" style={{ marginTop: 20 }}>
                        Already verified?{' '}
                        <Link to="/login" className="auth-link">Go to login</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
