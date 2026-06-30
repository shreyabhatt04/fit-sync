import { useState, useEffect } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import { customerService } from '../../../services/customerService'
import { getInitials, getStatusClass, formatDate } from '../../../utils/helpers'
import API from '../../../utils/api'
import './promotions.css'

const templates = [
    {
        id: 1,
        label: 'New Year Offer',
        subject: '🎉 New Year Special — 20% Off All Plans!',
        body: 'Dear {name},\n\nCelebrate the New Year with us! Get 20% off on all membership plans this month.\n\nVisit us today and start your fitness journey!\n\nBest regards,\nFitSync Team',
    },
    {
        id: 2,
        label: 'Renewal Reminder',
        subject: '⏰ Your Membership is Expiring Soon',
        body: 'Dear {name},\n\nYour gym membership is expiring soon. Renew now to continue enjoying our facilities without interruption.\n\nSpecial renewal discount available for existing members!\n\nBest regards,\nFitSync Team',
    },
    {
        id: 3,
        label: 'Summer Offer',
        subject: '☀️ Summer Special — Get Fit This Season!',
        body: 'Dear {name},\n\nSummer is here and it\'s time to get fit! We\'re offering special summer packages starting at just ₹799/month.\n\nDon\'t miss out!\n\nBest regards,\nFitSync Team',
    },
]

function EmailPromotions() {
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState([])
    const [subject, setSubject] = useState('')
    const [body, setBody] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [search, setSearch] = useState('')
    const [sending, setSending] = useState(false)
    const [result, setResult] = useState(null)  // { sentCount, failedCount }
    const [error, setError] = useState('')

    // History tab
    const [activeTab, setActiveTab] = useState('compose')
    const [history, setHistory] = useState([])
    const [historyLoading, setHistoryLoading] = useState(false)

    useEffect(() => {
        customerService.getAll({ limit: 200 })
            .then(res => setMembers(res.data))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const fetchHistory = async () => {
        setHistoryLoading(true)
        try {
            const res = await API.get('/promotions/history')
            setHistory(res.data.data)
        } catch (err) {
            console.error(err)
        } finally {
            setHistoryLoading(false)
        }
    }

    useEffect(() => {
        if (activeTab === 'history') fetchHistory()
    }, [activeTab])

    const filtered = members.filter((m) => {
        const matchStatus = filterStatus === 'all' || m.status === filterStatus
        const matchSearch = `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase())
        return matchStatus && matchSearch
    })

    const toggleSelect = (id) =>
        setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])

    const toggleAll = () =>
        setSelected(selected.length === filtered.length ? [] : filtered.map(m => m._id))

    const applyTemplate = (t) => { setSubject(t.subject); setBody(t.body) }

    const handleSend = async () => {
        if (!selected.length || !subject.trim() || !body.trim()) return
        setSending(true)
        setError('')
        setResult(null)
        try {
            const res = await API.post('/promotions/send', {
                customerIds: selected,
                subject,
                body,
            })
            setResult(res.data.data)
            setSelected([])
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send emails. Check your SMTP settings.')
        } finally {
            setSending(false)
        }
    }

    return (
        <AdminLayout>
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Email Promotions</h1>
                        <p className="page-subtitle">Send promotional emails to your members</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="tabs" style={{ marginBottom: 20 }}>
                    <button className={`tab-btn ${activeTab === 'compose' ? 'active' : ''}`}
                        onClick={() => setActiveTab('compose')}>Compose</button>
                    <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}>Sent History</button>
                </div>

                {activeTab === 'compose' && (
                    <>
                        {result && (
                            <div className="alert alert-success" style={{ marginBottom: 20 }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Sent to <strong>{result.sentCount}</strong> member{result.sentCount !== 1 ? 's' : ''}
                                {result.failedCount > 0 && ` · ${result.failedCount} failed (invalid email address)`}
                            </div>
                        )}

                        {error && (
                            <div className="alert alert-danger" style={{ marginBottom: 20 }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <div className="promotions-layout">
                            {/* Left — Member Selection */}
                            <div className="card promo-member-panel">
                                <div className="promo-panel-header">
                                    <h3 style={{ fontSize: 14, fontWeight: 600 }}>Select Recipients</h3>
                                    <span className="badge badge-info">{selected.length} selected</span>
                                </div>

                                <div style={{ display: 'flex', gap: 8, marginBottom: 12, padding: '0 16px' }}>
                                    <div className="search-input-wrapper" style={{ flex: 1 }}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="11" cy="11" r="8" />
                                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                        </svg>
                                        <input type="text" className="search-input" placeholder="Search member..."
                                            value={search} onChange={(e) => setSearch(e.target.value)} />
                                    </div>
                                    <select className="form-select" style={{ width: 120 }}
                                        value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                        <option value="all">All</option>
                                        <option value="active">Active</option>
                                        <option value="expired">Expired</option>
                                        <option value="pending">Pending</option>
                                    </select>
                                </div>

                                <div className="promo-select-all">
                                    <label className="checkbox-label">
                                        <input type="checkbox"
                                            checked={filtered.length > 0 && selected.length === filtered.length}
                                            onChange={toggleAll} />
                                        Select All ({filtered.length})
                                    </label>
                                </div>

                                <div className="promo-member-list">
                                    {loading ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                                            <div className="spinner" />
                                        </div>
                                    ) : filtered.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
                                            No members found
                                        </div>
                                    ) : filtered.map((m) => (
                                        <label key={m._id} className="promo-member-item">
                                            <input type="checkbox"
                                                checked={selected.includes(m._id)}
                                                onChange={() => toggleSelect(m._id)} />
                                            <div className="avatar avatar-sm" style={{ background: '#f2f2f2', color: '#2b2b2b', flexShrink: 0 }}>
                                                {getInitials(`${m.firstName} ${m.lastName}`)}
                                            </div>
                                            <div className="promo-member-info">
                                                <p className="promo-member-name">{m.firstName} {m.lastName}</p>
                                                <p className="promo-member-email">{m.email}</p>
                                            </div>
                                            <span className={`badge ${getStatusClass(m.status)}`} style={{ fontSize: 11 }}>
                                                {m.status}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Right — Compose */}
                            <div className="promo-compose-panel">
                                <div className="card" style={{ marginBottom: 16 }}>
                                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Quick Templates</h3>
                                    <div className="template-list">
                                        {templates.map(t => (
                                            <button key={t.id} className="template-btn" onClick={() => applyTemplate(t)}>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="card">
                                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Compose Email</h3>
                                    <div className="form-group">
                                        <label className="form-label">Subject *</label>
                                        <input className="form-input" placeholder="Email subject"
                                            value={subject} onChange={(e) => setSubject(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Message Body *</label>
                                        <textarea className="form-textarea" rows={8}
                                            placeholder="Write your message here..."
                                            value={body} onChange={(e) => setBody(e.target.value)} />
                                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                            Use {'{name}'} to personalise with each member's first name.
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, alignItems: 'center' }}>
                                        {!selected.length && (
                                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                                Select at least 1 recipient
                                            </p>
                                        )}
                                        <button className="btn btn-primary"
                                            onClick={handleSend}
                                            disabled={!selected.length || !subject.trim() || !body.trim() || sending}>
                                            {sending ? (
                                                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                            ) : (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <line x1="22" y1="2" x2="11" y2="13" />
                                                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                                </svg>
                                            )}
                                            Send to {selected.length || 0} Members
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'history' && (
                    <div className="card" style={{ padding: 0 }}>
                        <div className="table-container" style={{ border: 'none' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Subject</th>
                                        <th>Sent</th>
                                        <th>Failed</th>
                                        <th>Recipients</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyLoading ? (
                                        <tr><td colSpan="5">
                                            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                                                <div className="spinner" />
                                            </div>
                                        </td></tr>
                                    ) : history.length === 0 ? (
                                        <tr><td colSpan="5">
                                            <div className="empty-state">
                                                <h3>No emails sent yet</h3>
                                                <p>Send your first promotion from the Compose tab</p>
                                            </div>
                                        </td></tr>
                                    ) : history.map((h) => (
                                        <tr key={h._id}>
                                            <td style={{ fontSize: 13 }}>{formatDate(h.createdAt)}</td>
                                            <td style={{ fontSize: 13, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {h.subject}
                                            </td>
                                            <td>
                                                <span className="badge badge-success">{h.sentCount} sent</span>
                                            </td>
                                            <td>
                                                {h.failedCount > 0
                                                    ? <span className="badge badge-danger">{h.failedCount} failed</span>
                                                    : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                                                }
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {(h.recipients || []).slice(0, 3).map(r => r.name).join(', ')}
                                                {(h.recipients || []).length > 3 && ` +${h.recipients.length - 3} more`}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}

export default EmailPromotions