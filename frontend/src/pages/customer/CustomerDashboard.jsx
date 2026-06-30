import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import CustomerLayout from '../../components/customer/CustomerLayout'
import { useAuth } from '../../hooks/useAuth'
import { subscriptionService } from '../../services/subscriptionService'
import { attendanceService } from '../../services/attendanceService'
import { paymentService } from '../../services/paymentService'
import { formatDate, formatCurrency, getStatusClass } from '../../utils/helpers'
import './customer.css'

function CustomerDashboard() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [recentAttendance, setRecentAttendance] = useState([])
  const [recentPayments, setRecentPayments] = useState([])
  const [attStats, setAttStats] = useState({ present: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [subRes, attRes, payRes] = await Promise.all([
          subscriptionService.getAll({ limit: 1 }),
          attendanceService.getAll({ limit: 7 }),
          paymentService.getAll({ limit: 3 }),
        ])

        if (subRes.data.length > 0) setSubscription(subRes.data[0])

        const attData = attRes.data || []
        setRecentAttendance(attData.slice(0, 7))
        const present = attData.filter(a => a.status === 'present').length
        setAttStats({ present, total: attData.length })

        setRecentPayments(payRes.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const daysLeft = subscription
    ? Math.max(0, Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0

  const attPct = attStats.total > 0
    ? Math.round((attStats.present / attStats.total) * 100)
    : 0

  const isExpiringSoon = daysLeft <= 7 && daysLeft > 0

  if (loading) {
    return (
      <CustomerLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
        </div>
      </CustomerLayout>
    )
  }

  return (
    <CustomerLayout>
      <div className="customer-page">

        {/* Welcome Banner */}
        <div className="welcome-banner">
          <div className="welcome-text">
            <h2 className="welcome-title">
              Welcome back, {user?.name?.split(' ')[0] || 'Member'}! 👋
            </h2>
            <p className="welcome-sub">Keep up the great work on your fitness journey!</p>
          </div>
          {subscription && (
            <div className="welcome-plan-badge">
              <span className="plan-icon">⭐</span>
              <div>
                <p className="plan-badge-label">Current Plan</p>
                <p className="plan-badge-name">{subscription.membership?.name}</p>
              </div>
            </div>
          )}
        </div>

        {/* Expiry Alert */}
        {isExpiringSoon && (
          <div className="expiry-alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>
              Your membership expires in <strong>{daysLeft} days</strong> on {formatDate(subscription?.endDate)}.{' '}
              <Link to="/customer/subscription"
                style={{ color: 'inherit', fontWeight: 700, textDecoration: 'underline' }}>
                Renew Now
              </Link>
            </span>
          </div>
        )}

        {/* Stat Cards */}
        <div className="customer-stats-grid">
          {[
            {
              label: 'Membership Plan',
              value: subscription?.membership?.name || 'No Plan',
              sub: subscription ? `Valid till ${formatDate(subscription.endDate)}` : 'Subscribe to a plan',
              icon: '🏋️', color: '#f2f2f2', iconBg: '#2b2b2b',
            },
            {
              label: 'Days Remaining',
              value: subscription ? `${daysLeft} days` : '—',
              sub: 'Until membership expires',
              icon: '📅', color: '#f0fdf4', iconBg: '#16a34a',
            },
            {
              label: 'Attendance This Month',
              value: `${attStats.present}/${attStats.total}`,
              sub: `${attPct}% attendance rate`,
              icon: '✅', color: '#f0faf4', iconBg: '#166035',
            },
            {
              label: 'Total Paid',
              value: formatCurrency(recentPayments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)),
              sub: 'Recent payments total',
              icon: '💳', color: '#f8f8f8', iconBg: '#404040',
            },
          ].map((s) => (
            <div key={s.label} className="customer-stat-card" style={{ background: s.color }}>
              <div className="customer-stat-icon" style={{ background: s.iconBg }}>
                <span>{s.icon}</span>
              </div>
              <div>
                <p className="customer-stat-label">{s.label}</p>
                <p className="customer-stat-value">{s.value}</p>
                <p className="customer-stat-sub">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Attendance + Payments Row */}
        <div className="customer-row">
          {/* Recent Attendance */}
          <div className="card">
            <div className="card-header-row">
              <h3 className="customer-card-title">Recent Attendance</h3>
              <Link to="/customer/attendance" className="customer-card-link">View all</Link>
            </div>
            <div className="att-progress-row">
              <div className="att-progress-track">
                <div className="att-progress-fill" style={{ width: `${attPct}%` }} />
              </div>
              <span className="att-progress-label">{attPct}%</span>
            </div>
            {recentAttendance.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                No attendance records yet
              </p>
            ) : (
              <div className="attendance-week">
                {recentAttendance.map((a) => (
                  <div key={a._id} className={`att-day ${a.status}`}>
                    <div className={`att-dot ${a.status}`} />
                    <p className="att-day-date">
                      {new Date(a.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                    </p>
                    <p className="att-day-num">{new Date(a.date).getDate()}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="att-legend">
              <span className="att-legend-item present">● Present</span>
              <span className="att-legend-item absent">● Absent</span>
            </div>
          </div>

          {/* Recent Payments */}
          <div className="card">
            <div className="card-header-row">
              <h3 className="customer-card-title">Recent Payments</h3>
              <Link to="/customer/payments" className="customer-card-link">View all</Link>
            </div>
            {recentPayments.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                No payments yet
              </p>
            ) : (
              <div className="customer-payment-list">
                {recentPayments.map((p) => (
                  <div key={p._id} className="customer-payment-item">
                    <div className="customer-payment-icon">💳</div>
                    <div className="customer-payment-info">
                      <p className="customer-payment-plan">
                        {p.subscription?.membership?.name || 'Gym'} Membership
                      </p>
                      <p className="customer-payment-date">{formatDate(p.paymentDate)}</p>
                    </div>
                    <div className="customer-payment-right">
                      <p className="customer-payment-amount">{formatCurrency(p.amount)}</p>
                      <span className={`badge ${getStatusClass(p.status)}`}
                        style={{ fontSize: 11 }}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {subscription && (
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Next payment due</span>
                  <span style={{ fontWeight: 600 }}>{formatDate(subscription.endDate)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="quick-links">
          {[
            { to: '/customer/subscription', icon: '📦', label: 'My Subscription', sub: 'View & renew plans' },
            { to: '/customer/attendance', icon: '✅', label: 'Attendance', sub: 'Check your record' },
            { to: '/customer/payments', icon: '💳', label: 'Payments', sub: 'Payment history' },
            { to: '/customer/messages', icon: '💬', label: 'Messages', sub: 'Chat with gym' },
          ].map((q) => (
            <Link key={q.to} to={q.to} className="quick-link-card">
              <span className="quick-link-icon">{q.icon}</span>
              <p className="quick-link-label">{q.label}</p>
              <p className="quick-link-sub">{q.sub}</p>
            </Link>
          ))}
        </div>
      </div>
    </CustomerLayout>
  )
}

export default CustomerDashboard