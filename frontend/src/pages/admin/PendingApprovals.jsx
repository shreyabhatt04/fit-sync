// frontend/src/pages/admin/PendingApprovals.jsx — Batch 21 (#5/#6/#7)
//
// Lists customers who've accepted their invite and are waiting for the
// gym admin to approve their account. Admin can approve or reject each.

import { useState, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { customerService } from '../../services/customerService'
import { useToast } from '../../context/ToastContext'

export default function PendingApprovals() {
    const toast = useToast()
    const [list, setList] = useState([])
    const [loading, setLoading] = useState(true)
    const [acting, setActing] = useState(null)   // user._id currently being approved/rejected

    const load = async () => {
        setLoading(true)
        try {
            const res = await customerService.getPendingApprovals()
            setList(res.data || [])
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not load pending approvals.')
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => { load() }, [])

    const handleApprove = async (u) => {
        if (!confirm(`Approve ${u.firstName} ${u.lastName}? They'll be able to log in immediately.`)) return
        setActing(u._id)
        try {
            await customerService.approve(u._id)
            toast.success(`${u.firstName} approved`)
            await load()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not approve.')
        } finally {
            setActing(null)
        }
    }

    const handleReject = async (u) => {
        if (!confirm(`Reject ${u.firstName} ${u.lastName}? They will not be able to log in.`)) return
        setActing(u._id)
        try {
            await customerService.reject(u._id)
            toast.success(`${u.firstName} rejected`)
            await load()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not reject.')
        } finally {
            setActing(null)
        }
    }

    return (
        <AdminLayout>
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Pending Approvals</h1>
                        <p className="page-subtitle">
                            Customers who've accepted their invite and are waiting to be approved.
                        </p>
                    </div>
                </div>

                <div className="card" style={{ padding: 0 }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                            <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
                        </div>
                    ) : list.length === 0 ? (
                        <div className="empty-state" style={{ padding: 60 }}>
                            <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                            <h3>No pending approvals</h3>
                            <p>All customer registrations have been reviewed.</p>
                        </div>
                    ) : (
                        <div className="table-container" style={{ border: 'none' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Registered</th>
                                        <th style={{ width: 200 }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {list.map(u => (
                                        <tr key={u._id}>
                                            <td style={{ fontWeight: 600 }}>
                                                {u.firstName} {u.lastName}
                                            </td>
                                            <td>{u.email}</td>
                                            <td>{u.phone || '—'}</td>
                                            <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                                {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        disabled={acting === u._id}
                                                        onClick={() => handleApprove(u)}
                                                    >
                                                        {acting === u._id ? '…' : '✓ Approve'}
                                                    </button>
                                                    <button
                                                        className="btn btn-sm"
                                                        style={{ color: '#dc2626', background: 'transparent', border: '1px solid #fca5a5' }}
                                                        disabled={acting === u._id}
                                                        onClick={() => handleReject(u)}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    )
}
