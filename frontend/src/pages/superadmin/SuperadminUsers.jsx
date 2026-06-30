import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import SuperadminLayout from './SuperadminLayout'
import './superadmin.css'

const ROLE_BADGE = {
    admin:    'badge-info',
    customer: 'badge-success',
    staff:    'badge-warning',
}

export default function SuperadminUsers() {
    const [users,      setUsers]      = useState([])
    const [pagination, setPagination] = useState({})
    const [loading,    setLoading]    = useState(true)
    const [acting,     setActing]     = useState(null)
    const [filters,    setFilters]    = useState({ role: '', search: '', page: 1 })

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (filters.role)   params.set('role',   filters.role)
            if (filters.search) params.set('search', filters.search)
            params.set('page',  filters.page)
            params.set('limit', 15)

            const { data } = await api.get(`/superadmin/users?${params}`)
            setUsers(data.data)
            setPagination(data.pagination)
        } catch {
            // handled by api interceptor
        } finally {
            setLoading(false)
        }
    }, [filters])

    useEffect(() => { load() }, [load])

    const handleToggleActive = async (id, currentActive) => {
        if (!confirm(`${currentActive ? 'Deactivate' : 'Activate'} this user?`)) return
        setActing(id)
        try {
            await api.patch(`/superadmin/users/${id}/toggle-active`)
            setUsers(prev =>
                prev.map(u => u._id === id ? { ...u, isActive: !u.isActive } : u)
            )
        } catch {
            alert('Failed to update user')
        } finally {
            setActing(null)
        }
    }

    const getName = (u) =>
        u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email

    return (
        <SuperadminLayout title="Users">
            <div className="sa-page">

                {/* Summary */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {[
                        { label: 'Total Users', value: pagination.total ?? '—' },
                        { label: 'Admins',      value: users.filter(u => u.role === 'admin').length },
                        { label: 'Customers',   value: users.filter(u => u.role === 'customer').length },
                        { label: 'Active',      value: users.filter(u => u.isActive).length },
                    ].map(s => (
                        <div key={s.label} style={{
                            background: '#fff', border: '1px solid var(--border)',
                            borderRadius: 10, padding: '12px 20px', minWidth: 120,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        }}>
                            <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>
                                {s.label}
                            </p>
                            <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                                {s.value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="sa-filters">
                    <input
                        className="form-input sa-search"
                        placeholder="Search by name or email..."
                        value={filters.search}
                        onChange={e => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))}
                    />
                    <select
                        className="form-select sa-select"
                        value={filters.role}
                        onChange={e => setFilters(p => ({ ...p, role: e.target.value, page: 1 }))}
                    >
                        <option value="">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="customer">Customer</option>
                        <option value="staff">Staff</option>
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
                                        <th>NAME</th>
                                        <th>EMAIL</th>
                                        <th>PHONE</th>
                                        <th>ROLE</th>
                                        <th>JOINED</th>
                                        <th>STATUS</th>
                                        <th>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                                                No users found
                                            </td>
                                        </tr>
                                    ) : users.map((u) => (
                                        <tr key={u._id}>
                                            <td>
                                                <p style={{ fontSize: 13.5, fontWeight: 600 }}>{getName(u)}</p>
                                            </td>
                                            <td style={{ fontSize: 13 }}>{u.email}</td>
                                            <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{u.phone || '—'}</td>
                                            <td>
                                                <span className={`badge ${ROLE_BADGE[u.role] || 'badge-gray'}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {new Date(u.createdAt).toLocaleDateString('en-IN')}
                                            </td>
                                            <td>
                                                <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                                                    {u.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-primary'}`}
                                                    onClick={() => handleToggleActive(u._id, u.isActive)}
                                                    disabled={acting === u._id}
                                                >
                                                    {acting === u._id
                                                        ? '...'
                                                        : u.isActive ? 'Deactivate' : 'Activate'
                                                    }
                                                </button>
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
                            {pagination.total} users · Page {pagination.page} of {pagination.pages}
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
