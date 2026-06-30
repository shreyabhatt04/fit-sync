// frontend/src/pages/auth/AcceptInvite.jsx — Batch 21 (guide feedback #5)
//
// Public page at /accept-invite/:token. Fetches invite metadata to show a
// friendly welcome header (gym name + invitee name), then lets the user
// set a password. On submit:
//   - role 'admin' / 'staff' → server returns a token, we log them in
//   - role 'customer' → server returns requiresApproval=true, we show
//     a "thanks, your gym admin will approve you" screen instead

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import API from '../../utils/api'
import { useAuth } from '../../hooks/useAuth'

export default function AcceptInvite() {
    const { token } = useParams()
    const navigate = useNavigate()
    const { login } = useAuth()

    const [invite, setInvite]     = useState(null)
    const [loading, setLoading]   = useState(true)
    const [loadError, setLoadError] = useState('')

    const [password, setPassword]       = useState('')
    const [confirmPwd, setConfirmPwd]   = useState('')
    const [submitting, setSubmitting]   = useState(false)
    const [submitError, setSubmitError] = useState('')
    const [done, setDone] = useState(null)   // null | 'pending' (post-submit success state)

    // Fetch invite metadata once on mount
    useEffect(() => {
        let cancelled = false
        API.get(`/auth/invite/${token}`)
            .then(res => { if (!cancelled) setInvite(res.data.data) })
            .catch(err => {
                if (!cancelled) setLoadError(err.response?.data?.message || 'Could not load invite.')
            })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [token])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitError('')
        if (password.length < 6) {
            setSubmitError('Password must be at least 6 characters')
            return
        }
        if (password !== confirmPwd) {
            setSubmitError('Passwords do not match')
            return
        }
        setSubmitting(true)
        try {
            const res = await API.post('/auth/register-invite', { token, password })
            const body = res.data
            if (body.requiresApproval) {
                // Customer flow — server gave us no token; show pending screen
                setDone('pending')
            } else {
                // Admin/staff flow — server gave us a token; log in immediately
                login(body.data, body.data.token)
                navigate(body.data.role === 'admin' ? '/admin/dashboard' : '/customer/dashboard')
            }
        } catch (err) {
            setSubmitError(err.response?.data?.message || 'Failed to set up account.')
        } finally {
            setSubmitting(false)
        }
    }

    // Loading state
    if (loading) return (
        <div className="auth-page">
            <div className="auth-right" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
            </div>
        </div>
    )

    // Token invalid/expired
    if (loadError || !invite) return (
        <CenteredCard
            icon="⚠️"
            iconBg="#fef2f2"
            iconColor="#991b1b"
            title="Invite link is invalid or expired"
            body={
                <>
                    <p>{loadError || 'This invite link is no longer valid.'}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Ask whoever invited you to send a new link, or visit the{' '}
                        <Link to="/login" className="auth-link">login page</Link>{' '}
                        if you already have an account.
                    </p>
                </>
            }
        />
    )

    // Successfully submitted — pending approval
    if (done === 'pending') return (
        <CenteredCard
            icon="⏳"
            iconBg="#fffbeb"
            iconColor="#92400e"
            title="Account set up — awaiting approval"
            body={
                <>
                    <p>
                        Thanks {invite.firstName}! Your password is set. Your gym admin will
                        review your registration and you'll be able to log in once approved.
                    </p>
                    <Link to="/login" className="btn btn-primary" style={{ marginTop: 12, display: 'inline-block' }}>
                        Go to login page
                    </Link>
                </>
            }
        />
    )

    // Main form
    return (
        <div className="auth-page">
            <div className="auth-right">
                <div className="auth-form-wrapper" style={{ maxWidth: 440 }}>
                    <h1 className="auth-title" style={{ marginBottom: 6 }}>
                        Welcome{invite.gymName ? ` to ${invite.gymName}` : ''}
                    </h1>
                    <p className="auth-subtitle" style={{ marginBottom: 24 }}>
                        Hi {invite.firstName} — set a password to finish setting up your account.
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input className="form-input" value={invite.email} disabled />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Choose a password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                minLength={6}
                                required
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={confirmPwd}
                                onChange={e => setConfirmPwd(e.target.value)}
                                minLength={6}
                                required
                            />
                        </div>

                        {submitError && (
                            <div style={{
                                padding: '10px 12px',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: 6,
                                color: '#991b1b',
                                fontSize: 13,
                                marginBottom: 12,
                            }}>{submitError}</div>
                        )}

                        <button type="submit" className="btn btn-primary auth-submit" disabled={submitting}>
                            {submitting
                                ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                : 'Set password & continue'
                            }
                        </button>
                    </form>

                    {invite.role === 'customer' && (
                        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 16, lineHeight: 1.5 }}>
                            ℹ️ After you set your password, your gym admin will need to approve your
                            account before you can log in. This usually takes less than a day.
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

// Small reusable centred-card component for the loading/error/done states.
function CenteredCard({ icon, iconBg, iconColor, title, body }) {
    return (
        <div className="auth-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <div className="auth-right" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                    background: '#fff',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '32px 28px',
                    maxWidth: 440,
                    textAlign: 'center',
                }}>
                    <div style={{
                        width: 56, height: 56,
                        borderRadius: '50%',
                        background: iconBg,
                        color: iconColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 28, margin: '0 auto 14px',
                    }}>{icon}</div>
                    <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{title}</h2>
                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>{body}</div>
                </div>
            </div>
        </div>
    )
}
