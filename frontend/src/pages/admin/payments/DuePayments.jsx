import { useState, useEffect } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import { paymentService } from '../../../services/paymentService'
import { formatDate, formatCurrency, getInitials } from '../../../utils/helpers'
import '../payments/payments.css'

function DuePayments() {
  const [duePayments, setDuePayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('due')
  const [reminders, setReminders] = useState({})

  const fetchDue = async () => {
    setLoading(true)
    try {
      const res = await paymentService.getDue()
      setDuePayments(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDue() }, [])

  const totalDue = duePayments.reduce((s, p) => s + p.amount, 0)

  const getDaysOverdue = (dueDate) => {
    const diff = Math.ceil((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }

  const getOverdueClass = (days) => {
    if (days > 20) return 'critical'
    if (days > 7) return 'warning'
    return 'normal'
  }

  const sendReminder = (id) => {
    setReminders(prev => ({ ...prev, [id]: true }))
  }

  return (
    <AdminLayout>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Due Payments</h1>
            <p className="page-subtitle">
              {duePayments.length} members with pending payments
            </p>
          </div>
        </div>

        {!loading && duePayments.length > 0 && (
          <div className="due-alert-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>
              Total pending amount: <strong>{formatCurrency(totalDue)}</strong> from {duePayments.length} members.
              Consider sending payment reminders.
            </span>
          </div>
        )}

        <div className="tabs">
          {['due', 'reminders'].map((t) => (
            <button key={t}
              className={`tab-btn ${activeTab === t ? 'active' : ''}`}
              onClick={() => setActiveTab(t)}>
              {t === 'due' ? 'Due Payments' : 'Reminder History'}
            </button>
          ))}
        </div>

        {activeTab === 'due' && (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-container" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Member</th><th>Amount Due</th>
                    <th>Due Date</th><th>Overdue By</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="5">
                      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                        <div className="spinner" />
                      </div>
                    </td></tr>
                  ) : duePayments.length === 0 ? (
                    <tr><td colSpan="5">
                      <div className="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <h3>No due payments</h3>
                        <p>All payments are up to date!</p>
                      </div>
                    </td></tr>
                  ) : duePayments.map((p) => {
                    const days = getDaysOverdue(p.dueDate)
                    return (
                      <tr key={p._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="avatar" style={{ background: '#fef2f2', color: '#dc2626' }}>
                              {getInitials(`${p.customer?.firstName || ''} ${p.customer?.lastName || ''}`)}
                            </div>
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 500 }}>
                                {p.customer?.firstName} {p.customer?.lastName}
                              </p>
                              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {p.customer?.phone}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--danger)' }}>
                          {formatCurrency(p.amount)}
                        </td>
                        <td style={{ fontSize: 13 }}>{formatDate(p.dueDate)}</td>
                        <td>
                          <span className={`days-overdue-badge ${getOverdueClass(days)}`}>
                            {days > 0 ? `${days} days` : 'Today'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => sendReminder(p._id)}
                              disabled={reminders[p._id]}
                            >
                              {reminders[p._id] ? '✓ Sent' : 'Send Reminder'}
                            </button>
                            <button className="btn btn-primary btn-sm">Collect</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reminders' && (
          <div className="card">
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <h3>No reminders sent yet</h3>
              <p>Reminder history will appear here after you send reminders</p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default DuePayments