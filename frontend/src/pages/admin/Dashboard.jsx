import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import StatCard from '../../components/shared/StatCard'
import { reportService } from '../../services/reportService'
import { subscriptionService } from '../../services/subscriptionService'
import { paymentService } from '../../services/paymentService'
import { customerService } from '../../services/customerService'
import { formatCurrency, formatDate, getInitials, getStatusClass } from '../../utils/helpers'
import './dashboard.css'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [revenueData, setRevenueData] = useState([])
  const [recentMembers, setRecentMembers] = useState([])
  const [upcomingRenewals, setUpcomingRenewals] = useState([])
  const [recentPayments, setRecentPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, financialRes, customersRes, renewalsRes, paymentsRes] = await Promise.all([
          reportService.getDashboardStats(),
          reportService.getFinancialReport(),
          customerService.getAll({ limit: 5 }),
          subscriptionService.getUpcomingRenewals(),
          paymentService.getAll({ limit: 4 }),
        ])
        setStats(statsRes.data)
        setRevenueData(financialRes.data)
        setRecentMembers(customersRes.data)
        setUpcomingRenewals(renewalsRes.data)
        setRecentPayments(paymentsRes.data)
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
        </div>
      </AdminLayout>
    )
  }

  const maxRevenue = Math.max(...revenueData.map(d => d.income), 1)

  const statsCards = [
    { title: 'Total Members', value: stats?.totalMembers || 0, trend: '+12%', trendUp: true, color: 'blue', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
    { title: 'Active Subscriptions', value: stats?.activeSubscriptions || 0, trend: '+8%', trendUp: true, color: 'green', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg> },
    { title: 'Monthly Revenue', value: formatCurrency(stats?.monthlyRevenue || 0), trend: '+15%', trendUp: true, color: 'orange', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> },
    { title: 'Due Payments', value: stats?.duePayments || 0, trend: '-3%', trendUp: false, color: 'red', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
    { title: 'Monthly Expenses', value: formatCurrency(stats?.monthlyExpenses ?? stats?.totalExpenses ?? 0), trend: '+5%', trendUp: false, color: 'purple', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg> },
  ]

  return (
    <AdminLayout>
      <div className="page-content">
      <div className="dashboard">
        <div className="stats-grid">
          {statsCards.map((s) => <StatCard key={s.title} {...s} />)}
        </div>

        <div className="dashboard-row">
          {/* Revenue Chart */}
          <div className="card dashboard-chart-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Monthly Revenue</h3>
                <p className="card-subtitle">Last 6 months</p>
              </div>
            </div>
            <div className="bar-chart">
              {revenueData.map((d, i) => (
                <div key={i} className="bar-item">
                  <div className="bar-value">{formatCurrency(d.income)}</div>
                  <div className="bar" style={{ height: `${(d.income / maxRevenue) * 160}px`, animationDelay: `${i * 0.07}s` }} />
                  <div className="bar-label">{d.month}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Members */}
          <div className="card dashboard-members-card">
            <div className="card-header">
              <h3 className="card-title">Recent Members</h3>
              <Link to="/admin/customers" className="card-link">View all</Link>
            </div>
            <div className="member-list">
              {recentMembers.map((m) => (
                <div key={m._id} className="member-item">
                  <div className="avatar" style={{ background: '#f2f2f2', color: '#2b2b2b' }}>
                    {getInitials(`${m.firstName} ${m.lastName}`)}
                  </div>
                  <div className="member-info">
                    <p className="member-name">{m.firstName} {m.lastName}</p>
                    <p className="member-meta">{m.status} · {formatDate(m.joinDate)}</p>
                  </div>
                  <span className={`badge ${getStatusClass(m.status)}`}>{m.status}</span>
                </div>
              ))}
              {recentMembers.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No members yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-row">
          {/* Upcoming Renewals */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Upcoming Renewals</h3>
              <Link to="/admin/subscriptions" className="card-link">View all</Link>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Member</th><th>Plan</th><th>Expiry</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {upcomingRenewals.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No upcoming renewals</td></tr>
                  ) : upcomingRenewals.map((r) => {
                    const daysLeft = Math.ceil((new Date(r.endDate) - new Date()) / (1000 * 60 * 60 * 24))
                    return (
                      <tr key={r._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="avatar avatar-sm" style={{ background: '#f2f2f2', color: '#2b2b2b' }}>
                              {getInitials(`${r.customer?.firstName} ${r.customer?.lastName}`)}
                            </div>
                            {r.customer?.firstName} {r.customer?.lastName}
                          </div>
                        </td>
                        <td>{r.membership?.name}</td>
                        <td>{formatDate(r.endDate)}</td>
                        <td>
                          <span className={`badge ${daysLeft <= 3 ? 'badge-danger' : 'badge-warning'}`}>
                            {daysLeft}d left
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Payments */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Payments</h3>
              <Link to="/admin/payments" className="card-link">View all</Link>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Member</th><th>Amount</th><th>Date</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {recentPayments.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No payments yet</td></tr>
                  ) : recentPayments.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="avatar avatar-sm" style={{ background: '#f2f2f2', color: '#2b2b2b' }}>
                            {getInitials(`${p.customer?.firstName} ${p.customer?.lastName}`)}
                          </div>
                          {p.customer?.firstName} {p.customer?.lastName}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                      <td>{formatDate(p.paymentDate)}</td>
                      <td><span className={`badge ${getStatusClass(p.status)}`}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      </div>
    </AdminLayout>
  )
}

export default Dashboard