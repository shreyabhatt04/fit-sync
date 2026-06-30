import { useState, useEffect } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import { customerService } from '../../../services/customerService'
import { getInitials, formatDate } from '../../../utils/helpers'
import API from '../../../utils/api'
import './promotions.css'

function PromoDatabase() {
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')
    // Map of customerId → lastContacted ISO date string (from API)
    const [lastContacted, setLastContacted] = useState({})
    const [contacting, setContacting] = useState({}) // loading state per button

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true)
            try {
                const [membersRes, contactedRes] = await Promise.all([
                    customerService.getAll({ limit: 200 }),
                    API.get('/promotions/last-contacted'),
                ])
                setMembers(membersRes.data)
                setLastContacted(contactedRes.data.data || {})
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchAll()
    }, [])

    const isEligible = (m) => m.status === 'expired' || m.status === 'pending'

    const filtered = members.filter((m) => {
        const name = `${m.firstName} ${m.lastName}`.toLowerCase()
        const matchSearch = name.includes(search.toLowerCase())
        const matchFilter =
            filter === 'all' ||
            (filter === 'active' && m.status === 'active') ||
            (filter === 'expired' && m.status === 'expired') ||
            (filter === 'contacted' && lastContacted[m._id]) ||
            (filter === 'notcontacted' && !lastContacted[m._id])
        return matchSearch && matchFilter
    })

    const handleMarkContacted = async (id) => {
        setContacting(prev => ({ ...prev, [id]: true }))
        try {
            await API.post('/promotions/mark-contacted', { customerId: id })
            // Update local state immediately so button shows as contacted
            setLastContacted(prev => ({ ...prev, [id]: new Date().toISOString() }))
        } catch (err) {
            console.error('Failed to mark contacted:', err)
        } finally {
            setContacting(prev => ({ ...prev, [id]: false }))
        }
    }

    const getStatusBadge = (status) => {
        const map = { active: 'badge-success', expired: 'badge-danger', pending: 'badge-warning' }
        return map[status] || 'badge-gray'
    }

    const eligibleCount = members.filter(isEligible).length
    const contactedCount = Object.keys(lastContacted).length
    const pendingContactCount = members.filter(m => isEligible(m) && !lastContacted[m._id]).length

    return (
        <AdminLayout>
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Promotional Database</h1>
                        <p className="page-subtitle">Members eligible for promotional outreach</p>
                    </div>
                </div>

                {/* Summary chips */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                    {[
                        { label: 'Total Members', value: members.length, color: 'var(--primary)', bg: 'var(--primary-light)' },
                        { label: 'Eligible', value: eligibleCount, color: 'var(--warning)', bg: 'var(--warning-light)' },
                        { label: 'Contacted', value: contactedCount, color: 'var(--success)', bg: 'var(--success-light)' },
                        { label: 'Pending Contact', value: pendingContactCount, color: 'var(--danger)', bg: 'var(--danger-light)' },
                    ].map((s) => (
                        <div key={s.label} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 20px', borderRadius: 'var(--radius-full)',
                            background: s.bg,
                        }}>
                            <span style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</span>
                            <span style={{ fontSize: 13, fontWeight: 500, color: s.color }}>{s.label}</span>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="filter-bar">
                    <div className="search-input-wrapper">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input type="text" className="search-input" placeholder="Search member..."
                            value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <select className="form-select" style={{ width: 200 }}
                        value={filter} onChange={(e) => setFilter(e.target.value)}>
                        <option value="all">All Members</option>
                        <option value="expired">Expired Memberships</option>
                        <option value="active">Active Members</option>
                        <option value="contacted">Already Contacted</option>
                        <option value="notcontacted">Not Yet Contacted</option>
                    </select>
                </div>

                {/* Table */}
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-container" style={{ border: 'none' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Member</th>
                                    <th>Phone</th>
                                    <th>Status</th>
                                    <th>Last Contacted</th>
                                    <th>Eligible</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="6">
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                                            <div className="spinner" />
                                        </div>
                                    </td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan="6">
                                        <div className="empty-state">
                                            <h3>No members found</h3>
                                            <p>Try adjusting your search or filters</p>
                                        </div>
                                    </td></tr>
                                ) : filtered.map((m) => (
                                    <tr key={m._id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="avatar" style={{ background: '#f2f2f2', color: '#2b2b2b' }}>
                                                    {getInitials(`${m.firstName} ${m.lastName}`)}
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: 14, fontWeight: 500 }}>
                                                        {m.firstName} {m.lastName}
                                                    </p>
                                                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 13 }}>{m.phone}</td>
                                        <td>
                                            <span className={`badge ${getStatusBadge(m.status)}`}>
                                                {m.status}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 13 }}>
                                            {lastContacted[m._id] ? (
                                                <span style={{ color: 'var(--success)', fontWeight: 500 }}>
                                                    ✓ {formatDate(lastContacted[m._id])}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>Never</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge ${isEligible(m) ? 'badge-success' : 'badge-gray'}`}>
                                                {isEligible(m) ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => handleMarkContacted(m._id)}
                                                disabled={!!lastContacted[m._id] || contacting[m._id]}
                                                style={lastContacted[m._id] ? { opacity: 0.6 } : {}}
                                            >
                                                {contacting[m._id] ? (
                                                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                                ) : lastContacted[m._id] ? '✓ Contacted' : 'Mark Contacted'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}

export default PromoDatabase