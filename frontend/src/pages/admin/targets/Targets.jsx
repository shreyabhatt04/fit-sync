import { useState, useEffect } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import Modal from '../../../components/shared/Modal'
import { targetService } from '../../../services/targetService'
import { formatDate, formatCurrency } from '../../../utils/helpers'
import './targets.css'

const emptyForm = { title: '', type: 'Revenue', target: '', current: '', deadline: '' }

function Targets() {
    const [targets, setTargets] = useState([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState({ open: false, editing: null })
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [deleteModal, setDeleteModal] = useState({ open: false, target: null })
    const [deleting, setDeleting] = useState(false)

    const fetchTargets = async () => {
        setLoading(true)
        try {
            const res = await targetService.getAll()
            setTargets(res.data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchTargets() }, [])

    const openAdd = () => { setForm(emptyForm); setModal({ open: true, editing: null }) }
    const openEdit = (t) => {
        setForm({
            title: t.title, type: t.type,
            target: t.target, current: t.current,
            deadline: t.deadline ? t.deadline.split('T')[0] : '',
        })
        setModal({ open: true, editing: t })
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const unitMap = { Revenue: '₹', Attendance: '%', Members: '', Renewals: '' }
            const data = {
                title: form.title,
                type: form.type,
                target: Number(form.target),
                current: Number(form.current),
                deadline: form.deadline || undefined,
                unit: unitMap[form.type] || '',
            }
            if (modal.editing) {
                await targetService.update(modal.editing._id, data)
            } else {
                await targetService.create(data)
            }
            setModal({ open: false, editing: null })
            fetchTargets()
        } catch (err) {
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await targetService.delete(deleteModal.target._id)
            setDeleteModal({ open: false, target: null })
            fetchTargets()
        } catch (err) {
            console.error(err)
        } finally {
            setDeleting(false)
        }
    }

    const getPct = (current, target) =>
        target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0

    const getStatusInfo = (pct) => {
        if (pct >= 100) return { label: 'Achieved', cls: 'badge-success', color: 'var(--success)' }
        if (pct >= 75) return { label: 'On Track', cls: 'badge-info', color: 'var(--primary)' }
        if (pct >= 50) return { label: 'In Progress', cls: 'badge-warning', color: 'var(--warning)' }
        return { label: 'Behind', cls: 'badge-danger', color: 'var(--danger)' }
    }

    const formatVal = (val, unit) =>
        unit === '₹' ? formatCurrency(val) : `${val}${unit || ''}`

    return (
        <AdminLayout>
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Targets</h1>
                        <p className="page-subtitle">Set and track your business goals</p>
                    </div>
                    <button className="btn btn-primary" onClick={openAdd}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Target
                    </button>
                </div>

                {/* Summary */}
                <div className="targets-summary">
                    {[
                        { label: 'Total', value: targets.length, color: 'var(--primary)' },
                        { label: 'Achieved', value: targets.filter(t => getPct(t.current, t.target) >= 100).length, color: 'var(--success)' },
                        { label: 'On Track', value: targets.filter(t => { const p = getPct(t.current, t.target); return p >= 75 && p < 100 }).length, color: 'var(--info)' },
                        { label: 'Behind', value: targets.filter(t => getPct(t.current, t.target) < 50).length, color: 'var(--danger)' },
                    ].map((s) => (
                        <div key={s.label} className="target-summary-chip">
                            <span style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.label}</span>
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
                        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
                    </div>
                ) : targets.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="10" />
                                <circle cx="12" cy="12" r="6" />
                                <circle cx="12" cy="12" r="2" />
                            </svg>
                            <h3>No targets set yet</h3>
                            <p>Add your first business target to get started</p>
                            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openAdd}>
                                Add First Target
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="targets-grid">
                        {targets.map((t) => {
                            const pct = getPct(t.current, t.target)
                            const status = getStatusInfo(pct)
                            return (
                                <div key={t._id} className="target-card">
                                    <div className="target-card-top">
                                        <div>
                                            <h3 className="target-title">{t.title}</h3>
                                            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                                <span className="badge badge-gray">{t.type}</span>
                                                <span className={`badge ${status.cls}`}>{status.label}</span>
                                            </div>
                                        </div>
                                        <div className="target-pct-circle" style={{ '--pct-color': status.color }}>
                                            <span>{pct}%</span>
                                        </div>
                                    </div>

                                    <div className="target-values">
                                        <div className="target-val-item">
                                            <p className="target-val-label">Current</p>
                                            <p className="target-val" style={{ color: status.color }}>
                                                {formatVal(t.current, t.unit)}
                                            </p>
                                        </div>
                                        <div className="target-val-divider" />
                                        <div className="target-val-item">
                                            <p className="target-val-label">Target</p>
                                            <p className="target-val">{formatVal(t.target, t.unit)}</p>
                                        </div>
                                        <div className="target-val-divider" />
                                        <div className="target-val-item">
                                            <p className="target-val-label">Deadline</p>
                                            <p className="target-val" style={{ fontSize: 13 }}>
                                                {t.deadline ? formatDate(t.deadline) : '—'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="target-progress-track">
                                        <div className="target-progress-fill"
                                            style={{ width: `${pct}%`, background: status.color }} />
                                    </div>

                                    <div className="target-card-footer">
                                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}>Edit</button>
                                        <button className="btn btn-sm"
                                            style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}
                                            onClick={() => setDeleteModal({ open: true, target: t })}>Delete</button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Add/Edit Modal */}
                <Modal isOpen={modal.open}
                    onClose={() => setModal({ open: false, editing: null })}
                    title={modal.editing ? 'Edit Target' : 'Add Target'}
                    footer={
                        <>
                            <button className="btn btn-secondary"
                                onClick={() => setModal({ open: false, editing: null })}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving
                                    ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                    : 'Save'
                                }
                            </button>
                        </>
                    }
                >
                    <div className="form-group">
                        <label className="form-label">Title *</label>
                        <input className="form-input" placeholder="Target title"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <select className="form-select" value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                <option>Revenue</option>
                                <option>Members</option>
                                <option>Attendance</option>
                                <option>Renewals</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Deadline</label>
                            <input type="date" className="form-input"
                                value={form.deadline}
                                onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Target Value *</label>
                            <input type="number" className="form-input" placeholder="e.g. 50000"
                                value={form.target}
                                onChange={(e) => setForm({ ...form, target: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Current Value</label>
                            <input type="number" className="form-input" placeholder="e.g. 32000"
                                value={form.current}
                                onChange={(e) => setForm({ ...form, current: e.target.value })} />
                        </div>
                    </div>
                </Modal>

                {/* Delete Modal */}
                <Modal isOpen={deleteModal.open}
                    onClose={() => setDeleteModal({ open: false, target: null })}
                    title="Delete Target"
                    footer={
                        <>
                            <button className="btn btn-secondary"
                                onClick={() => setDeleteModal({ open: false, target: null })}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                                {deleting
                                    ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                    : 'Delete'
                                }
                            </button>
                        </>
                    }
                >
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
                        <p>Delete target <strong>{deleteModal.target?.title}</strong>?</p>
                    </div>
                </Modal>
            </div>
        </AdminLayout>
    )
}

export default Targets