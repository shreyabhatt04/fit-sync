import { useState, useEffect } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import { attendanceService } from '../../../services/attendanceService'
import { customerService } from '../../../services/customerService'
import { formatDate, getInitials } from '../../../utils/helpers'
import './attendance.css'

function Attendance() {
    const [view, setView] = useState('mark')
    const [members, setMembers] = useState([])
    const [history, setHistory] = useState([])
    const [search, setSearch] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [attendance, setAttendance] = useState({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [historyLoading, setHistoryLoading] = useState(false)

    const fetchMembers = async () => {
        setLoading(true)
        try {
            const res = await customerService.getAll({ limit: 100, status: 'active' })
            setMembers(res.data)
            const initial = {}
            res.data.forEach(m => { initial[m._id] = null })
            setAttendance(initial)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const fetchHistory = async () => {
        setHistoryLoading(true)
        try {
            const res = await attendanceService.getAll({ date })
            setHistory(res.data)
        } catch (err) {
            console.error(err)
        } finally {
            setHistoryLoading(false)
        }
    }

    useEffect(() => { fetchMembers() }, [])
    useEffect(() => { if (view === 'history') fetchHistory() }, [view, date])

    const toggle = (id, status) => {
        setAttendance(prev => ({
            ...prev,
            [id]: prev[id] === status ? null : status,
        }))
        setSaved(false)
    }

    const markAll = (status) => {
        const all = {}
        members.forEach(m => { all[m._id] = status })
        setAttendance(all)
        setSaved(false)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const records = Object.entries(attendance)
                .filter(([, status]) => status !== null)
                .map(([customerId, status]) => ({
                    customerId,
                    status,
                    date,
                    checkIn: status === 'present'
                        ? new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        : null,
                }))

            if (records.length === 0) {
                alert('Please mark at least one member before saving.')
                setSaving(false)
                return
            }

            await attendanceService.mark(records)
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (err) {
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    const filteredMembers = members.filter(m =>
        m.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        m.lastName?.toLowerCase().includes(search.toLowerCase())
    )

    const presentCount = Object.values(attendance).filter(v => v === 'present').length
    const absentCount = Object.values(attendance).filter(v => v === 'absent').length

    return (
        <AdminLayout>
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Attendance</h1>
                        <p className="page-subtitle">Track daily member attendance</p>
                    </div>
                    <div className="attendance-view-toggle">
                        <button className={`toggle-btn ${view === 'mark' ? 'active' : ''}`}
                            onClick={() => setView('mark')}>Mark Attendance</button>
                        <button className={`toggle-btn ${view === 'history' ? 'active' : ''}`}
                            onClick={() => setView('history')}>History</button>
                    </div>
                </div>

                {view === 'mark' && (
                    <>
                        <div className="attendance-controls card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                                <div>
                                    <label className="form-label">Date</label>
                                    <input type="date" className="form-input" style={{ width: 180 }}
                                        value={date} onChange={(e) => setDate(e.target.value)} />
                                </div>
                                <div className="search-input-wrapper" style={{ flex: 1, minWidth: 200 }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    <input type="text" className="search-input" placeholder="Search member..."
                                        value={search} onChange={(e) => setSearch(e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                                    <button className="btn btn-secondary btn-sm"
                                        onClick={() => markAll('present')}>Mark All Present</button>
                                    <button className="btn btn-secondary btn-sm"
                                        onClick={() => markAll('absent')}>Mark All Absent</button>
                                </div>
                            </div>

                            <div className="attendance-summary">
                                <div className="attendance-summary-item present">
                                    <span className="att-count">{presentCount}</span>
                                    <span className="att-label">Present</span>
                                </div>
                                <div className="attendance-summary-item absent">
                                    <span className="att-count">{absentCount}</span>
                                    <span className="att-label">Absent</span>
                                </div>
                                <div className="attendance-summary-item total">
                                    <span className="att-count">
                                        {members.length - presentCount - absentCount}
                                    </span>
                                    <span className="att-label">Not Marked</span>
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{ padding: 0 }}>
                            <div className="table-container" style={{ border: 'none' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Member</th><th>Plan</th><th>Phone</th><th>Mark Attendance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="4">
                                                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                                                    <div className="spinner" />
                                                </div>
                                            </td></tr>
                                        ) : filteredMembers.length === 0 ? (
                                            <tr><td colSpan="4">
                                                <div className="empty-state">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                        <circle cx="9" cy="7" r="4" />
                                                    </svg>
                                                    <h3>No active members</h3>
                                                    <p>Active members will appear here once you add them to your gym.</p>
                                                </div>
                                            </td></tr>
                                        ) : filteredMembers.map((m) => (
                                            <tr key={m._id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div className="avatar" style={{ background: '#f2f2f2', color: '#2b2b2b' }}>
                                                            {getInitials(`${m.firstName} ${m.lastName}`)}
                                                        </div>
                                                        <span style={{ fontWeight: 500 }}>{m.firstName} {m.lastName}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="badge badge-gray">{m.status}</span>
                                                </td>
                                                <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.phone}</td>
                                                <td>
                                                    <div className="att-toggle">
                                                        <button
                                                            className={`att-btn att-present ${attendance[m._id] === 'present' ? 'active' : ''}`}
                                                            onClick={() => toggle(m._id, 'present')}>Present</button>
                                                        <button
                                                            className={`att-btn att-absent ${attendance[m._id] === 'absent' ? 'active' : ''}`}
                                                            onClick={() => toggle(m._id, 'absent')}>Absent</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 12, alignItems: 'center' }}>
                            {saved && (
                                <span style={{ color: 'var(--success)', fontSize: 14, fontWeight: 500 }}>
                                    ✓ Attendance saved!
                                </span>
                            )}
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving
                                    ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                    : 'Save Attendance'
                                }
                            </button>
                        </div>
                    </>
                )}

                {view === 'history' && (
                    <>
                        <div className="filter-bar">
                            <input type="date" className="form-input" style={{ width: 200 }}
                                value={date} onChange={(e) => setDate(e.target.value)} />
                            <button className="btn btn-secondary" onClick={fetchHistory}>Load</button>
                        </div>
                        <div className="card" style={{ padding: 0 }}>
                            <div className="table-container" style={{ border: 'none' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Member</th><th>Date</th>
                                            <th>Check In</th><th>Check Out</th><th>Status</th>
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
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <rect x="3" y="4" width="18" height="18" rx="2" />
                                                        <line x1="16" y1="2" x2="16" y2="6" />
                                                        <line x1="8" y1="2" x2="8" y2="6" />
                                                        <line x1="3" y1="10" x2="21" y2="10" />
                                                    </svg>
                                                    <h3>No attendance for this date</h3>
                                                    <p>Mark members present in the check-in tab to see records here.</p>
                                                </div>
                                            </td></tr>
                                        ) : history.map((h) => (
                                            <tr key={h._id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div className="avatar avatar-sm" style={{ background: '#f2f2f2', color: '#2b2b2b' }}>
                                                            {getInitials(`${h.customer?.firstName || ''} ${h.customer?.lastName || ''}`)}
                                                        </div>
                                                        {h.customer?.firstName} {h.customer?.lastName}
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: 13 }}>{formatDate(h.date)}</td>
                                                <td style={{ fontSize: 13 }}>{h.checkIn || '—'}</td>
                                                <td style={{ fontSize: 13 }}>{h.checkOut || '—'}</td>
                                                <td>
                                                    <span className={`badge ${h.status === 'present' ? 'badge-success' : 'badge-danger'}`}>
                                                        {h.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </AdminLayout>
    )
}

export default Attendance