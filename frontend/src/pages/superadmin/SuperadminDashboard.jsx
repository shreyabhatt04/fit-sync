import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import SuperadminLayout from './SuperadminLayout'
import './superadmin.css'

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`

const STATUS_COLORS = {
  active:    'badge-success',
  trial:     'badge-warning',
  expired:   'badge-danger',
  suspended: 'badge-gray',
}

export default function SuperadminDashboard() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    api.get('/superadmin/dashboard')
      .then(res => setData(res.data.data))
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <SuperadminLayout>
      <div className="sa-loading"><div className="spinner" /></div>
    </SuperadminLayout>
  )

  if (error) return (
    <SuperadminLayout>
      <div className="sa-error">{error}</div>
    </SuperadminLayout>
  )

  const { stats, recentCompanies, recentSubscriptions, expiringThisWeek, expiringByTier } = data

  const statCards = [
    { label: 'Total Gyms',    value: stats.totalCompanies,    sub: `${stats.activeCompanies} active`,   color: 'default' },
    { label: 'On Trial',      value: stats.trialCompanies,    sub: 'Free trial',                         color: 'warning' },
    { label: 'Expired',       value: stats.expiredCompanies,  sub: 'Need renewal',                       color: 'danger'  },
    { label: 'Total Users',   value: stats.totalUsers,        sub: 'Across all gyms',                    color: 'default' },
    { label: 'Total Revenue', value: fmt(stats.totalRevenueRupees), sub: fmt(stats.monthRevenueRupees) + ' this month', color: 'success' },
  ]

  // Tiered expiry rows — each shows N gyms expiring in that bucket with
  // their names. Tiers cascade urgency: 1-day = critical, 7-day = warning,
  // 15-day = info. We only render rows that have at least one company.
  // `expiringByTier` is the new shape from Batch 16; if a stale backend
  // is still returning the old shape, fall back to the flat list.
  const tierRows = expiringByTier ? [
    { key: '1d',  count: expiringByTier.within1Day.length,  list: expiringByTier.within1Day,  label: 'within 1 day',     bg: '#fef2f2', border: '#fecaca', color: '#991b1b', icon: '🚨' },
    { key: '7d',  count: expiringByTier.within7Day.length,  list: expiringByTier.within7Day,  label: 'within 7 days',    bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: '⚠️' },
    { key: '15d', count: expiringByTier.within15Day.length, list: expiringByTier.within15Day, label: 'within 15 days',   bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', icon: '📅' },
  ].filter(r => r.count > 0) : null

  return (
    <SuperadminLayout title="Dashboard">
      <div className="sa-page">

        {/* Stat cards */}
        <div className="sa-stats-grid">
          {statCards.map((s) => (
            <div key={s.label} className={`sa-stat-card sa-stat-card--${s.color}`}>
              <p className="sa-stat-label">{s.label}</p>
              <p className="sa-stat-value">{s.value}</p>
              <p className="sa-stat-sub">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Expiring soon — tiered alert (Batch 16, guide feedback #11a).
            Each tier renders only when it has at least one gym. Falls back to
            the flat banner if the backend hasn't been upgraded yet. */}
        {tierRows && tierRows.length > 0 ? (
          <div style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg, 10px)',
            overflow: 'hidden',
            marginBottom: 24,
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>Subscription expiry alerts ({expiringByTier.total})</span>
              <Link to="/superadmin/companies" style={{ fontSize: 12, color: 'var(--primary, #10B981)', fontWeight: 500 }}>
                Manage all gyms →
              </Link>
            </div>
            {tierRows.map(t => (
              <div key={t.key} style={{
                padding: '10px 16px',
                background: t.bg,
                borderTop: t.key === tierRows[0].key ? 'none' : `1px solid ${t.border}`,
                display: 'flex', alignItems: 'flex-start', gap: 12,
                fontSize: 13,
              }}>
                <span style={{ fontSize: 16, lineHeight: '20px' }}>{t.icon}</span>
                <div style={{ flex: 1 }}>
                  <strong style={{ color: t.color }}>
                    {t.count} gym{t.count !== 1 ? 's' : ''} expiring {t.label}:
                  </strong>{' '}
                  {t.list.map((g, i) => (
                    <span key={g._id}>
                      {i > 0 && ', '}
                      <Link to={`/superadmin/companies/${g._id}`}
                        style={{ color: t.color, textDecoration: 'underline', fontWeight: 500 }}>
                        {g.name}
                      </Link>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : expiringThisWeek?.length > 0 ? (
          // Backward-compat fallback — used only if the backend is older
          // than Batch 16 and didn't return expiringByTier.
          <div className="sa-alert sa-alert--warning">
            <span>⚠️</span>
            <div>
              <strong>{expiringThisWeek.length} subscription{expiringThisWeek.length > 1 ? 's' : ''} expiring this week:</strong>
              {' '}{expiringThisWeek.map(s => s.companyId?.name).join(', ')}
            </div>
          </div>
        ) : null}

        <div className="sa-row">
          {/* Recent Companies */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Gyms</h3>
              <Link to="/superadmin/companies" className="card-link">View all</Link>
            </div>
            <div className="sa-list">
              {recentCompanies.map((c) => (
                <div key={c._id} className="sa-list-item">
                  <div className="sa-list-main">
                    <Link to={`/superadmin/companies/${c._id}`} className="sa-list-name">
                      {c.name}
                    </Link>
                    <p className="sa-list-sub">{c.slug} · {c.ownerId?.email}</p>
                  </div>
                  <span className={`badge ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Subscriptions */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Subscriptions</h3>
              <Link to="/superadmin/subscriptions" className="card-link">View all</Link>
            </div>
            <div className="sa-list">
              {recentSubscriptions.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                  No subscriptions yet
                </p>
              ) : recentSubscriptions.map((s) => (
                <div key={s._id} className="sa-list-item">
                  <div className="sa-list-main">
                    <p className="sa-list-name">
                      {s.customer?.firstName} {s.customer?.lastName}
                    </p>
                    <p className="sa-list-sub">
                      {s.companyId?.name || '—'} · {s.membership?.name || 'Plan'}
                    </p>
                  </div>
                  <span className="sa-list-amount">{fmt(s.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SuperadminLayout>
  )
}
