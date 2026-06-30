import { useState, useEffect } from 'react'
import CustomerLayout from '../../components/customer/CustomerLayout'
import { attendanceService } from '../../services/attendanceService'
import { formatDate } from '../../utils/helpers'
import './customer.css'

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function MyAttendance() {
    const [attendance, setAttendance] = useState([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState('calendar')
    const [currentMonth, setCurrentMonth] = useState(new Date())

    useEffect(() => {
        const fetchAttendance = async () => {
            setLoading(true)
            try {
                const month = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
                const res = await attendanceService.getAll({ month })
                setAttendance(res.data)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchAttendance()
    }, [currentMonth])

    const getStatusForDay = (day) => {
        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const record = attendance.find(a => {
            const d = new Date(a.date)
            return d.getDate() === day &&
                d.getMonth() === currentMonth.getMonth() &&
                d.getFullYear() === currentMonth.getFullYear()
        })
        const today = new Date()
        if (!record) {
            const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
            return cellDate > today ? 'future' :
                cellDate.toDateString() === today.toDateString() ? 'today' : 'no-data'
        }
        return record.status
    }

    const buildCalendar = () => {
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()
        const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
        const cells = []
        for (let i = 0; i < firstDay; i++) cells.push({ day: null, status: 'empty' })
        for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, status: getStatusForDay(d) })
        return cells
    }

    const present = attendance.filter(a => a.status === 'present').length
    const absent = attendance.filter(a => a.status === 'absent').length
    const total = attendance.length
    const pct = total > 0 ? Math.round((present / total) * 100) : 0

    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))

    return (
        <CustomerLayout>
            <div className="customer-page">
                <div style={{ marginBottom: 4 }}>
                    <h1 className="page-title">My Attendance</h1>
                    <p className="page-subtitle">
                        {currentMonth.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                    </p>
                </div>

                {/* Summary */}
                <div className="customer-stats-grid">
                    {[
                        { label: 'Present', value: present, icon: '✅', color: '#f0fdf4', iconBg: '#16a34a' },
                        { label: 'Absent', value: absent, icon: '❌', color: '#fef2f2', iconBg: '#dc2626' },
                        { label: 'Total Days', value: total, icon: '📅', color: '#f2f2f2', iconBg: '#2b2b2b' },
                        { label: 'Attendance %', value: `${pct}%`, icon: '📊', color: '#f8f8f8', iconBg: '#404040' },
                    ].map((s) => (
                        <div key={s.label} className="customer-stat-card" style={{ background: s.color }}>
                            <div className="customer-stat-icon" style={{ background: s.iconBg }}>
                                <span>{s.icon}</span>
                            </div>
                            <div>
                                <p className="customer-stat-label">{s.label}</p>
                                <p className="customer-stat-value">{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* View Toggle + Month Nav */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {['calendar', 'list'].map((v) => (
                            <button key={v}
                                className={`btn ${view === v ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                                onClick={() => setView(v)}>
                                {v === 'calendar' ? '📅 Calendar' : '📋 List'}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button className="btn btn-secondary btn-sm" onClick={prevMonth}>← Prev</button>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>
                            {currentMonth.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                        </span>
                        <button className="btn btn-secondary btn-sm" onClick={nextMonth}>Next →</button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
                    </div>
                ) : (
                    <>
                        {view === 'calendar' && (
                            <div className="card">
                                <div className="attendance-calendar-grid">
                                    {WEEK_DAYS.map((d) => (
                                        <div key={d} className="cal-day-header">{d}</div>
                                    ))}
                                    {buildCalendar().map((c, i) => (
                                        <div key={i} className={`cal-day ${c.status}`}>
                                            {c.day || ''}
                                        </div>
                                    ))}
                                </div>
                                <div className="cal-legend">
                                    {[
                                        { label: 'Present', color: 'var(--success-light)', border: '#86efac' },
                                        { label: 'Absent', color: 'var(--danger-light)', border: '#fca5a5' },
                                        { label: 'No Data', color: 'var(--bg-secondary)', border: 'var(--border)' },
                                    ].map((l) => (
                                        <div key={l.label} className="cal-legend-item">
                                            <div className="cal-legend-dot"
                                                style={{ background: l.color, border: `1px solid ${l.border}` }} />
                                            <span>{l.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {view === 'list' && (
                            <div className="card" style={{ padding: 0 }}>
                                <div className="table-container" style={{ border: 'none' }}>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Date</th><th>Check In</th>
                                                <th>Check Out</th><th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {attendance.length === 0 ? (
                                                <tr><td colSpan="4">
                                                    <div className="empty-state">
                                                        <p>No attendance records this month</p>
                                                    </div>
                                                </td></tr>
                                            ) : attendance.map((a) => (
                                                <tr key={a._id}>
                                                    <td style={{ fontWeight: 500 }}>{formatDate(a.date)}</td>
                                                    <td style={{ fontSize: 13 }}>{a.checkIn || '—'}</td>
                                                    <td style={{ fontSize: 13 }}>{a.checkOut || '—'}</td>
                                                    <td>
                                                        <span className={`badge ${a.status === 'present' ? 'badge-success' : 'badge-danger'}`}>
                                                            {a.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </CustomerLayout>
    )
}

export default MyAttendance