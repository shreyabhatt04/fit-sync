// frontend/src/pages/superadmin/SuperadminPendingApprovals.jsx — Batch 21
//
// Two things in one page:
//   1. Pending gym admins (registered via /signup, awaiting approval)
//   2. Send a fresh gym-admin invite (skip-the-signup path)
//
// Combining them avoids creating two near-identical sidebar entries.

import { useState, useEffect } from 'react'
import api from '../../services/api'
import SuperadminLayout from './SuperadminLayout'
import './superadmin.css'

export default function SuperadminPendingApprovals() {
    const [list, setList] = useState([])
    const [loading, setLoading] = useState(true)
    const [acting, setActing] = useState(null)
    const [error, setError] = useState('')

    const [inviteOpen, setInviteOpen] = useState(false)
    const [inviteForm, setInviteForm] = useState({
        firstName: '', lastName: '', email: '', phone: '', gymName: '',
    })
    const [sendingInvite, setSendingInvite] = useState(false)
    const [inviteResult, setInviteResult] = useState(null)
    const [inviteError, setInviteError] = useState('')

    const load = async () => {
        setLoading(true)
        setError('')
        try {
            const res = await api.get('/superadmin/pending-approvals')
            setList(res.data.data || [])
        } catch (err) {
            setError(err.response?.data?.message || 'Could not load pending approvals.')
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => { load() }, [])

    const handleApprove = async (u) => {
        if (!confirm(`Approve ${u.firstName}? They'll be able to log in immediately.`)) return
        setActing(u._id)
        try {
            await api.post(`/superadmin/pending-approvals/${u._id}/approve`)
            await load()
        } catch (err) {
            alert(err.response?.data?.message || 'Could not approve.')
        } finally {
            setActing(null)
        }
    }

    const handleReject = async (u) => {
        if (!confirm(`Reject ${u.firstName}? They will not be able to log in.`)) return
        setActing(u._id)
        try {
            await api.post(`/superadmin/pending-approvals/${u._id}/reject`)
            await load()
        } catch (err) {
            alert(err.response?.data?.message || 'Could not reject.')
        } finally {
            setActing(null)
        }
    }

    const handleSendInvite = async (e) => {
        e.preventDefault()
        setSendingInvite(true)
        setInviteError('')
        setInviteResult(null)
        try {
            const res = await api.post('/superadmin/invite-admin', inviteForm)
            setInviteResult(res.data.data)
            setInviteForm({ firstName: '', lastName: '', email: '', phone: '', gymName: '' })
        } catch (err) {
            setInviteError(err.response?.data?.message || 'Could not send invite.')
        } finally {
            setSendingInvite(false)
        }
    }

    return (
        <SuperadminLayout title="Pending Approvals">
            <div className="sa-page">

                {/* Send invite block */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Invite a Gym Admin</h3>
                            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                                Send a direct invite — skips the signup-then-approve flow. The invitee
                                sets their own password and can log in immediately.
                            </p>
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={() => setInviteOpen(o => !o)}>
                            {inviteOpen ? 'Cancel' : '+ New Invite'}
                        </button>
                    </div>

                    {inviteOpen && (
                        <form onSubmit={handleSendInvite} style={{
                            paddingTop: 14, borderTop: '1px solid var(--border)',
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">First Name *</label>
                                    <input className="form-input" required
                                        value={inviteForm.firstName}
                                        onChange={e => setInviteForm({ ...inviteForm, firstName: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name</label>
                                    <input className="form-input"
                                        value={inviteForm.lastName}
                                        onChange={e => setInviteForm({ ...inviteForm, lastName: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email *</label>
                                    <input className="form-input" type="email" required
                                        value={inviteForm.email}
                                        onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input className="form-input"
                                        value={inviteForm.phone}
                                        onChange={e => setInviteForm({ ...inviteForm, phone: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Gym Name *</label>
                                    <input className="form-input" required
                                        value={inviteForm.gymName}
                                        onChange={e => setInviteForm({ ...inviteForm, gymName: e.target.value })} />
                                </div>
                            </div>

                            {inviteError && (
                                <div style={{
                                    marginBottom: 10, padding: '8px 12px', background: '#fef2f2',
                                    border: '1px solid #fecaca', color: '#991b1b',
                                    borderRadius: 6, fontSize: 13,
                                }}>{inviteError}</div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="submit" className="btn btn-primary" disabled={sendingInvite}>
                                    {sendingInvite ? 'Sending…' : 'Send invite'}
                                </button>
                            </div>
                        </form>
                    )}

                    {inviteResult && (
                        <div style={{
                            marginTop: 14, padding: '10px 14px',
                            background: '#f0fdf4', border: '1px solid #bbf7d0',
                            color: '#166534', borderRadius: 6, fontSize: 13,
                        }}>
                            ✓ Invite sent to <strong>{inviteResult.email}</strong> for{' '}
                            <strong>{inviteResult.gymName}</strong>.
                            {inviteResult.inviteUrl && (
                                <details style={{ marginTop: 6 }}>
                                    <summary style={{ cursor: 'pointer', fontSize: 12 }}>
                                        Show invite link (in case email isn't configured)
                                    </summary>
                                    <code style={{
                                        display: 'block', marginTop: 4, padding: 6,
                                        background: '#fff', borderRadius: 4,
                                        fontSize: 11, wordBreak: 'break-all',
                                    }}>{inviteResult.inviteUrl}</code>
                                </details>
                            )}
                        </div>
                    )}
                </div>

                {/* Pending approvals list */}
                <div className="card" style={{ padding: 0 }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Awaiting Approval</h3>
                        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                            Gym admins who registered via /signup and need superadmin review before login.
                        </p>
                    </div>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                            <div className="spinner" />
                        </div>
                    ) : error ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#991b1b' }}>{error}</div>
                    ) : list.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                            <p style={{ fontSize: 14 }}>No pending approvals. ✅</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Gym</th>
                                        <th>Email</th>
                                        <th>Registered</th>
                                        <th style={{ width: 200 }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {list.map(u => (
                                        <tr key={u._id}>
                                            <td style={{ fontWeight: 600 }}>
                                                {u.firstName} {u.lastName}
                                            </td>
                                            <td>{u.companyId?.name || '—'}</td>
                                            <td>{u.email}</td>
                                            <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                                {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn-primary btn-sm"
                                                        disabled={acting === u._id}
                                                        onClick={() => handleApprove(u)}>
                                                        {acting === u._id ? '…' : '✓ Approve'}
                                                    </button>
                                                    <button className="btn btn-sm"
                                                        style={{ color: '#dc2626', background: 'transparent', border: '1px solid #fca5a5' }}
                                                        disabled={acting === u._id}
                                                        onClick={() => handleReject(u)}>
                                                        Reject
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </SuperadminLayout>
    )
}
