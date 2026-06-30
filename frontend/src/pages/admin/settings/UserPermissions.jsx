import { useState, useEffect } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import Modal from '../../../components/shared/Modal'
import { staffService } from '../../../services/staffService'
import { customerService } from '../../../services/customerService'
import { getInitials } from '../../../utils/helpers'

const MODULES = [
    'Dashboard', 'Customers', 'Attendance', 'Memberships',
    'Subscriptions', 'Payments', 'Reports', 'Enquiries',
    'Targets', 'Tasks', 'Promotions', 'Settings',
]

const ROLE_DEFAULTS = {
    super_admin: MODULES,
    manager: ['Dashboard', 'Customers', 'Attendance', 'Payments', 'Reports'],
    trainer: ['Dashboard', 'Customers', 'Attendance'],
    staff: ['Dashboard', 'Customers'],
}

const roleLabels = {
    super_admin: 'Super Admin',
    manager: 'Manager',
    trainer: 'Trainer',
    staff: 'Staff',
}

const roleClass = {
    super_admin: 'badge-purple',
    manager: 'badge-info',
    trainer: 'badge-success',
    staff: 'badge-gray',
}

const emptyNewForm = { name: '', email: '', phone: '', role: 'trainer' }

function UserPermissions() {
    const [staffList, setStaffList] = useState([])
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [apiError, setApiError] = useState('')

    // Edit permissions modal
    const [editModal, setEditModal] = useState({ open: false, member: null })
    const [editPerms, setEditPerms] = useState([])
    const [editRole, setEditRole] = useState('trainer')
    const [editName, setEditName] = useState('')
    const [editPhone, setEditPhone] = useState('')
    const [saving, setSaving] = useState(false)

    // Add staff modal
    const [addModal, setAddModal] = useState(false)
    const [newForm, setNewForm] = useState(emptyNewForm)
    const [adding, setAdding] = useState(false)
    const [addError, setAddError] = useState('')

    // Delete confirm
    const [deleteModal, setDeleteModal] = useState({ open: false, member: null })
    const [deleting, setDeleting] = useState(false)

    const fetchStaff = async () => {
        setLoading(true)
        try {
            const res = await staffService.getAll()
            setStaffList(res.data)
        } catch (err) {
            setApiError('Failed to load staff')
        } finally {
            setLoading(false)
        }
    }

    const fetchCustomers = async () => {
        try {
            const res = await customerService.getAll({ limit: 100 })
            setCustomers(res.data)
        } catch (err) {
            console.error(err)
        }
    }

    useEffect(() => {
        fetchStaff()
        fetchCustomers()
    }, [])

    // ── Edit modal ──────────────────────────────────────────
    const openEdit = (member) => {
        setEditPerms([...(member.permissions || [])])
        setEditRole(member.role)
        setEditName(member.name)
        setEditPhone(member.phone || '')
        setEditModal({ open: true, member })
    }

    const handleRoleChange = (newRole) => {
        setEditRole(newRole)
        setEditPerms(ROLE_DEFAULTS[newRole] || [])
    }

    const togglePerm = (mod) => {
        setEditPerms(prev =>
            prev.includes(mod) ? prev.filter(p => p !== mod) : [...prev, mod]
        )
    }

    const handleSaveEdit = async () => {
        setSaving(true)
        try {
            await staffService.update(editModal.member._id, {
                name: editName,
                phone: editPhone,
                role: editRole,
                permissions: editPerms,
            })
            setEditModal({ open: false, member: null })
            fetchStaff()
        } catch (err) {
            setApiError(err.response?.data?.message || 'Failed to update staff')
        } finally {
            setSaving(false)
        }
    }

    // ── Add modal ───────────────────────────────────────────
    const openAdd = () => {
        setNewForm(emptyNewForm)
        setAddError('')
        setAddModal(true)
    }

    const handleAddStaff = async () => {
        if (!newForm.name.trim() || !newForm.email.trim()) {
            setAddError('Name and email are required')
            return
        }
        setAdding(true)
        setAddError('')
        try {
            await staffService.create(newForm)
            setAddModal(false)
            setNewForm(emptyNewForm)
            fetchStaff()
        } catch (err) {
            setAddError(err.response?.data?.message || 'Failed to add staff member')
        } finally {
            setAdding(false)
        }
    }

    // ── Delete ──────────────────────────────────────────────
    const handleDelete = async () => {
        setDeleting(true)
        try {
            await staffService.delete(deleteModal.member._id)
            setDeleteModal({ open: false, member: null })
            fetchStaff()
        } catch (err) {
            setApiError(err.response?.data?.message || 'Failed to remove staff member')
            setDeleteModal({ open: false, member: null })
        } finally {
            setDeleting(false)
        }
    }

    return (
        <AdminLayout>
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">User Permissions</h1>
                        <p className="page-subtitle">Manage staff roles and module access</p>
                    </div>
                    <button className="btn btn-primary" onClick={openAdd}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Staff
                    </button>
                </div>

                {apiError && (
                    <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                        {apiError}
                        <button
                            style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                            onClick={() => setApiError('')}
                        >✕</button>
                    </div>
                )}

                {/* Staff table */}
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-container" style={{ border: 'none' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Staff Member</th>
                                    <th>Role</th>
                                    <th>Module Access</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="4">
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                                            <div className="spinner" />
                                        </div>
                                    </td></tr>
                                ) : staffList.length === 0 ? (
                                    <tr><td colSpan="4">
                                        <div className="empty-state">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                <circle cx="9" cy="7" r="4" />
                                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                            </svg>
                                            <h3>No staff members yet</h3>
                                            <p>Invite staff to help manage your gym. They'll get role-based access to the modules you choose.</p>
                                        </div>
                                    </td></tr>
                                ) : staffList.map((u) => (
                                    <tr key={u._id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="avatar" style={{ background: '#f2f2f2', color: '#2b2b2b' }}>
                                                    {getInitials(u.name)}
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: 14, fontWeight: 500 }}>
                                                        {u.name}
                                                        {u.isOwner && (
                                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                                                                (you)
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${roleClass[u.role] || 'badge-gray'}`}>
                                                {roleLabels[u.role] || u.role}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                {(u.permissions || []).slice(0, 4).map(p => (
                                                    <span key={p} className="badge badge-gray" style={{ fontSize: 11 }}>{p}</span>
                                                ))}
                                                {(u.permissions || []).length > 4 && (
                                                    <span className="badge badge-gray" style={{ fontSize: 11 }}>
                                                        +{u.permissions.length - 4} more
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => openEdit(u)}
                                                    disabled={u.isOwner}
                                                    title={u.isOwner ? 'Cannot edit owner account here' : ''}
                                                >
                                                    Edit Permissions
                                                </button>
                                                {!u.isOwner && (
                                                    <button
                                                        className="btn btn-sm"
                                                        style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}
                                                        onClick={() => setDeleteModal({ open: true, member: u })}
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Members section */}
                {customers.length > 0 && (
                    <div style={{ marginTop: 24 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Gym Members</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                            Registered gym members — they have customer-level access only.
                        </p>
                        <div className="card" style={{ padding: 0 }}>
                            <div className="table-container" style={{ border: 'none' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Member</th><th>Email</th><th>Phone</th><th>Access Level</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customers.map((c) => (
                                            <tr key={c._id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div className="avatar avatar-sm" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                                                            {getInitials(`${c.firstName} ${c.lastName}`)}
                                                        </div>
                                                        <span style={{ fontSize: 14, fontWeight: 500 }}>
                                                            {c.firstName} {c.lastName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: 13 }}>{c.email}</td>
                                                <td style={{ fontSize: 13 }}>{c.phone}</td>
                                                <td>
                                                    <span className="badge badge-success" style={{ fontSize: 11 }}>
                                                        Customer Panel Only
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Permissions Modal */}
                <Modal
                    isOpen={editModal.open}
                    onClose={() => setEditModal({ open: false, member: null })}
                    title={`Edit — ${editModal.member?.name}`}
                    size="lg"
                    footer={
                        <>
                            <button className="btn btn-secondary"
                                onClick={() => setEditModal({ open: false, member: null })}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>
                                {saving
                                    ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                    : 'Save Permissions'
                                }
                            </button>
                        </>
                    }
                >
                    {/* Basic info */}
                    <div className="form-row" style={{ marginBottom: 4 }}>
                        <div className="form-group">
                            <label className="form-label">Name</label>
                            <input className="form-input" value={editName}
                                onChange={(e) => setEditName(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input className="form-input" placeholder="Phone number" value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)} />
                        </div>
                    </div>

                    {/* Role */}
                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label className="form-label">Role</label>
                        <select className="form-select" value={editRole} onChange={(e) => handleRoleChange(e.target.value)}>
                            <option value="super_admin">Super Admin</option>
                            <option value="manager">Manager</option>
                            <option value="trainer">Trainer</option>
                            <option value="staff">Staff</option>
                        </select>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                            Changing role resets permissions to that role's defaults — you can then adjust below.
                        </p>
                    </div>

                    {/* Module checkboxes */}
                    <div>
                        <label className="form-label">
                            Module Access ({editPerms.length}/{MODULES.length})
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 8 }}>
                            {MODULES.map((mod) => (
                                <label key={mod} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '8px 12px',
                                    border: `1px solid ${editPerms.includes(mod) ? 'var(--primary)' : 'var(--border)'}`,
                                    borderRadius: 'var(--radius)',
                                    cursor: 'pointer',
                                    background: editPerms.includes(mod) ? 'var(--primary-light)' : 'transparent',
                                    transition: 'var(--transition)',
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={editPerms.includes(mod)}
                                        onChange={() => togglePerm(mod)}
                                        style={{ accentColor: 'var(--primary)' }}
                                    />
                                    <span style={{
                                        fontSize: 13, fontWeight: 500,
                                        color: editPerms.includes(mod) ? 'var(--primary)' : 'var(--text-secondary)',
                                    }}>
                                        {mod}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </Modal>

                {/* Add Staff Modal */}
                <Modal
                    isOpen={addModal}
                    onClose={() => setAddModal(false)}
                    title="Add Staff Member"
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={() => setAddModal(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleAddStaff} disabled={adding}>
                                {adding
                                    ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                    : 'Add Staff'
                                }
                            </button>
                        </>
                    }
                >
                    {addError && (
                        <div className="alert alert-danger" style={{ marginBottom: 12 }}>{addError}</div>
                    )}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Full Name *</label>
                            <input className="form-input" placeholder="Staff member name"
                                value={newForm.name}
                                onChange={(e) => { setNewForm({ ...newForm, name: e.target.value }); setAddError('') }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input className="form-input" placeholder="Phone number"
                                value={newForm.phone}
                                onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email *</label>
                        <input type="email" className="form-input" placeholder="staff@fitsync.com"
                            value={newForm.email}
                            onChange={(e) => { setNewForm({ ...newForm, email: e.target.value }); setAddError('') }} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Role</label>
                        <select className="form-select" value={newForm.role}
                            onChange={(e) => setNewForm({ ...newForm, role: e.target.value })}>
                            <option value="manager">Manager</option>
                            <option value="trainer">Trainer</option>
                            <option value="staff">Staff</option>
                        </select>
                    </div>
                    <div className="alert alert-info">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        Default permissions for the selected role will be applied. You can edit them afterwards.
                    </div>
                </Modal>

                {/* Delete Confirm Modal */}
                <Modal
                    isOpen={deleteModal.open}
                    onClose={() => setDeleteModal({ open: false, member: null })}
                    title="Remove Staff Member"
                    footer={
                        <>
                            <button className="btn btn-secondary"
                                onClick={() => setDeleteModal({ open: false, member: null })}>
                                Cancel
                            </button>
                            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                                {deleting
                                    ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                    : 'Remove'
                                }
                            </button>
                        </>
                    }
                >
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
                        <p>Remove <strong>{deleteModal.member?.name}</strong> from your staff?</p>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
                            This cannot be undone.
                        </p>
                    </div>
                </Modal>
            </div>
        </AdminLayout>
    )
}

export default UserPermissions