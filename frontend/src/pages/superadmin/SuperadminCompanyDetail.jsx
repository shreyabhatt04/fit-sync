import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import SuperadminLayout from './SuperadminLayout'
import './superadmin.css'

const ALL_MODULES = [
  'members','attendance','payments','memberships',
  'reports','tasks','targets','promotions','staff',
]

export default function SuperadminCompanyDetail() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    api.get(`/superadmin/companies/${id}`)
      .then(res => setData(res.data.data))
      .catch(() => navigate('/superadmin/companies'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleModuleToggle = async (moduleName, current) => {
    setSaving(true)
    try {
      const { data: updated } = await api.patch(
        `/superadmin/companies/${id}/modules`,
        { modules: { [moduleName]: !current } }
      )
      setData(prev => ({ ...prev, company: updated.data }))
    } catch {
      alert('Failed to update module')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (status) => {
    if (!confirm(`Set status to "${status}"?`)) return
    try {
      const { data: updated } = await api.patch(`/superadmin/companies/${id}/status`, { status })
      setData(prev => ({ ...prev, company: updated.data }))
    } catch {
      alert('Failed to update status')
    }
  }

  if (loading) return (
    <SuperadminLayout><div className="sa-loading"><div className="spinner" /></div></SuperadminLayout>
  )

  const { company, subscriptions, users } = data
  const modules = company.modules || {}

  return (
    <SuperadminLayout title={company.name}>
      <div className="sa-page">

        {/* Back + actions */}
        <div className="sa-detail-header">
          <button className="btn btn-secondary" onClick={() => navigate('/superadmin/companies')}>
            ← Back
          </button>
          <div className="sa-actions">
            {company.status !== 'active' && (
              <button className="btn btn-primary" onClick={() => handleStatusChange('active')}>
                Activate
              </button>
            )}
            {company.status !== 'suspended' && (
              <button className="btn btn-danger" onClick={() => handleStatusChange('suspended')}>
                Suspend
              </button>
            )}
          </div>
        </div>

        <div className="sa-detail-grid">

          {/* Company Info */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Gym Info</h3>
              <span className={`badge badge-${company.status === 'active' ? 'success' : company.status === 'trial' ? 'warning' : 'danger'}`}>
                {company.status}
              </span>
            </div>
            <div className="sa-info-grid">
              {[
                { label: 'Name',        value: company.name },
                { label: 'Slug',        value: `/${company.slug}` },
                { label: 'Email',       value: company.email || '—' },
                { label: 'Phone',       value: company.phone || '—' },
                { label: 'Plan',        value: company.plan },
                { label: 'Created',     value: new Date(company.createdAt).toLocaleDateString('en-IN') },
                { label: 'Trial Ends',  value: company.trialEndsAt ? new Date(company.trialEndsAt).toLocaleDateString('en-IN') : '—' },
                { label: 'Owner',       value: `${company.ownerId?.firstName} ${company.ownerId?.lastName}` },
                { label: 'Owner Email', value: company.ownerId?.email || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="sa-info-item">
                  <p className="sa-info-label">{label}</p>
                  <p className="sa-info-value">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Module toggles */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Enabled Modules</h3>
              {saving && <span className="spinner" style={{ width: 16, height: 16 }} />}
            </div>
            <div className="sa-modules-grid">
              {ALL_MODULES.map(m => {
                const enabled = !!modules[m]
                return (
                  <div
                    key={m}
                    className={`sa-module-row ${enabled ? 'sa-module-row--on' : ''}`}
                    onClick={() => !saving && handleModuleToggle(m, enabled)}
                    role="switch"
                    aria-checked={enabled}
                    tabIndex={0}
                  >
                    <span className="sa-module-row__label">{m}</span>
                    <span className={`toggle-switch ${enabled ? 'toggle-switch--on' : ''}`} aria-hidden="true">
                      <span className="toggle-switch__thumb" />
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* Subscription history */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Subscription History</h3>
          </div>
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr><th>DATE</th><th>PLAN</th><th>CYCLE</th><th>MODULES</th><th>AMOUNT</th><th>STATUS</th><th>EXPIRES</th></tr>
              </thead>
              <tbody>
                {subscriptions.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No subscriptions yet</td></tr>
                ) : subscriptions.map(s => (
                  <tr key={s._id}>
                    <td>{new Date(s.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>{s.plan}</td>
                    <td>{s.billingCycle}</td>
                    <td>{s.selectedModules?.length ?? 0}</td>
                    <td style={{ fontWeight: 600 }}>₹{Math.round(s.amount / 100).toLocaleString('en-IN')}</td>
                    <td><span className={`badge ${s.status === 'active' ? 'badge-success' : s.status === 'expired' ? 'badge-danger' : 'badge-gray'}`}>{s.status}</span></td>
                    <td>{s.endDate ? new Date(s.endDate).toLocaleDateString('en-IN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Users */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Users ({users.length})</h3>
          </div>
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr><th>NAME</th><th>EMAIL</th><th>ROLE</th><th>JOINED</th><th>STATUS</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td style={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</td>
                    <td>{u.email}</td>
                    <td><span className="badge badge-gray">{u.role}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(u.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {u.isActive ? 'active' : 'inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </SuperadminLayout>
  )
}
