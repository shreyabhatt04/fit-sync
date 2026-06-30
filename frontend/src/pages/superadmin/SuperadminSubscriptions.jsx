import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import SuperadminLayout from './SuperadminLayout'
import './superadmin.css'

const STATUS_BADGE = {
    active:    'badge-success',
    expired:   'badge-danger',
    cancelled: 'badge-gray',
    pending:   'badge-warning',
}

export default function SuperadminSubscriptions() {
    const [subs,       setSubs]       = useState([])
    const [pagination, setPagination] = useState({})
    const [loading,    setLoading]    = useState(true)
    const [filters,    setFilters]    = useState({ status: '', page: 1 })

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (filters.status) params.set('status', filters.status)
            params.set('page',  filters.page)
            params.set('limit', 15)
            params.set('_', Date.now())  // cache-buster
            const { data } = await api.get(`/superadmin/subscriptions?${params}`, {
                headers: { 'Cache-Control': 'no-cache' },
            })
            setSubs(data.data || [])
            setPagination(data.pagination || {})
        } catch (err) {
            console.error('[SuperadminSubscriptions] load failed:', err)
        } finally {
            setLoading(false)
        }
    }, [filters])

    useEffect(() => { load() }, [load])

    const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`

    return (
        <SuperadminLayout title="Subscriptions">
            <div className="sa-page">

                {/* Filters */}
                <div className="sa-filters">
                    <select
                        className="form-select sa-select"
                        value={filters.status}
                        onChange={e => setFilters(p => ({ ...p, status: e.target.value, page: 1 }))}
                    >
                        <option value="">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="pending">Pending</option>
                        <option value="cancelled">Cancelled</option>
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
                                        <th>MEMBER</th>
                                        <th>PLAN</th>
                                        <th>AMOUNT</th>
                                        <th>START</th>
                                        <th>EXPIRY</th>
                                        <th>STATUS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subs.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                                                No subscriptions found
                                            </td>
                                        </tr>
                                    ) : subs.map((s) => (
                                        <tr key={s._id}>
                                            <td>
                                                <p style={{ fontSize: 13.5, fontWeight: 600 }}>
                                                    {s.customer?.firstName} {s.customer?.lastName}
                                                </p>
                                                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                    {s.customer?.email}
                                                </p>
                                            </td>
                                            <td style={{ fontSize: 13, fontWeight: 500 }}>
                                                {s.membership?.name || '—'}
                                                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                    {s.membership?.duration}
                                                </p>
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{fmt(s.amount)}</td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {s.startDate ? new Date(s.startDate).toLocaleDateString('en-IN') : '—'}
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {s.endDate ? new Date(s.endDate).toLocaleDateString('en-IN') : '—'}
                                            </td>
                                            <td>
                                                <span className={`badge ${STATUS_BADGE[s.status] || 'badge-gray'}`}>
                                                    {s.status}
                                                </span>
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
                            {pagination.total} subscriptions · Page {pagination.page} of {pagination.pages}
                        </span>
                        <div className="sa-pagination-btns">
                            <button
                                className="btn btn-sm btn-secondary"
                                disabled={filters.page <= 1}
                                onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
                            >← Prev</button>
                            <button
                                className="btn btn-sm btn-secondary"
                                disabled={filters.page >= pagination.pages}
                                onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
                            >Next →</button>
                        </div>
                    </div>
                )}

            </div>
        </SuperadminLayout>
    )
}
