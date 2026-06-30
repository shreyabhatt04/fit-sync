import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import SuperadminLayout from './SuperadminLayout'
import './superadmin.css'

const STATUS_BADGE = {
  active:    'badge-success',
  trial:     'badge-warning',
  expired:   'badge-danger',
  suspended: 'badge-gray',
}

export default function SuperadminCompanies() {
  const [companies, setCompanies]   = useState([])
  const [pagination, setPagination] = useState({})
  const [loading,  setLoading]      = useState(true)
  const [filters,  setFilters]      = useState({ status: '', search: '', page: 1 })
  const [acting,   setActing]       = useState(null) // companyId being actioned

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.search) params.set('search', filters.search)
      params.set('page',  filters.page)
      params.set('limit', 15)

      const { data } = await api.get(`/superadmin/companies?${params}`)
      setCompanies(data.data)
      setPagination(data.pagination)
    } catch {
      // handled by api interceptor
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  const handleStatusChange = async (id, status) => {
    if (!confirm(`Set company status to "${status}"?`)) return
    setActing(id)
    try {
      await api.patch(`/superadmin/companies/${id}/status`, { status })
      setCompanies(prev =>
        prev.map(c => c._id === id ? { ...c, status } : c)
      )
    } catch {
      alert('Failed to update status')
    } finally {
      setActing(null)
    }
  }

  const handleExtendTrial = async (id) => {
    const days = prompt('Extend trial by how many days?', '7')
    if (!days || isNaN(days)) return
    setActing(id)
    try {
      await api.patch(`/superadmin/companies/${id}/extend-trial`, { days: parseInt(days) })
      load()
    } catch {
      alert('Failed to extend trial')
    } finally {
      setActing(null)
    }
  }

  return (
    <SuperadminLayout title="Gyms">
      <div className="sa-page">

        {/* Filters */}
        <div className="sa-filters">
          <input
            className="form-input sa-search"
            placeholder="Search by name, email or slug..."
            value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))}
          />
          <select
            className="form-select sa-select"
            value={filters.status}
            onChange={e => setFilters(p => ({ ...p, status: e.target.value, page: 1 }))}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none' }}>
            {loading ? (
              <div className="sa-loading"><div className="spinner" /></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>GYM</th>
                    <th>OWNER</th>
                    <th>STATUS</th>
                    <th>PLAN</th>
                    <th>MEMBERS</th>
                    <th>TRIAL ENDS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                        No gyms found
                      </td>
                    </tr>
                  ) : companies.map((c) => (
                    <tr key={c._id}>
                      <td>
                        <Link to={`/superadmin/companies/${c._id}`} className="sa-table-name">
                          {c.name}
                        </Link>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          /{c.slug}
                        </p>
                      </td>
                      <td>
                        <p style={{ fontSize: 13, fontWeight: 500 }}>
                          {c.ownerId?.firstName} {c.ownerId?.lastName}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {c.ownerId?.email}
                        </p>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[c.status]}`}>{c.status}</span>
                      </td>
                      <td style={{ fontSize: 13 }}>{c.plan}</td>
                      <td style={{ fontSize: 13 }}>{c.memberCount ?? '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {c.trialEndsAt
                          ? new Date(c.trialEndsAt).toLocaleDateString('en-IN')
                          : '—'}
                      </td>
                      <td>
                        <div className="sa-actions">
                          <Link to={`/superadmin/companies/${c._id}`} className="btn btn-sm btn-secondary">
                            View
                          </Link>
                          {c.status !== 'active' && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleStatusChange(c._id, 'active')}
                              disabled={acting === c._id}
                            >
                              Activate
                            </button>
                          )}
                          {c.status !== 'suspended' && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleStatusChange(c._id, 'suspended')}
                              disabled={acting === c._id}
                            >
                              Suspend
                            </button>
                          )}
                          {(c.status === 'trial' || c.status === 'expired') && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleExtendTrial(c._id)}
                              disabled={acting === c._id}
                            >
                              +Trial
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="sa-pagination">
            <span className="sa-pagination-info">
              {pagination.total} gyms · Page {pagination.page} of {pagination.pages}
            </span>
            <div className="sa-pagination-btns">
              <button
                className="btn btn-sm btn-secondary"
                disabled={filters.page <= 1}
                onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
              >
                ← Prev
              </button>
              <button
                className="btn btn-sm btn-secondary"
                disabled={filters.page >= pagination.pages}
                onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
              >
                Next →
              </button>
            </div>
          </div>
        )}

      </div>
    </SuperadminLayout>
  )
}
