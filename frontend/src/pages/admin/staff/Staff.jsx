import { useState, useEffect, useMemo } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import Modal from '../../../components/shared/Modal'
import ErrorBanner from '../../../components/shared/ErrorBanner'
import { useToast } from '../../../context/ToastContext'
import { gymStaffService } from '../../../services/gymStaffService'
import { formatCurrency, getInitials } from '../../../utils/helpers'

const STAFF_TYPES = ['Helpdesk', 'Trainer', 'Cleaner']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed']

// Resolve a server-relative URL (e.g. "/uploads/staff-documents/abc.pdf")
// to an absolute URL the browser can fetch. The axios baseURL is the API
// root (".../api"), so we strip the trailing "/api" to get the origin.
const FILE_BASE = (() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    return apiUrl.replace(/\/api\/?$/, '')
})()
const fileUrl = (relativePath) => relativePath ? `${FILE_BASE}${relativePath}` : ''

const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_DOC_BYTES = 5 * 1024 * 1024

const emptyForm = {
    staffType: 'Helpdesk',
    name: '', email: '', phone: '', alternatePhone: '',
    bloodGroup: '', maritalStatus: '',
    dateOfBirth: '', anniversary: '',
    healthInsurance: false, healthInsuranceNote: '',
    healthInsuranceDocUrl: '',  // populated on edit; updated by upload/remove handlers
    aadhaarOnFile: false, aadhaarLast4: '', panNumber: '',
    monthlySalary: 0,
    achievements: '', isPersonalTrainer: false, personalTrainerSalary: 0,
    isActive: true,
}

const TYPE_BADGE = {
    Helpdesk: 'badge-blue',
    Trainer: 'badge-teal',
    Cleaner: 'badge-gray',
}

function Staff() {
    const toast = useToast()
    const [staff, setStaff] = useState([])
    const [payroll, setPayroll] = useState([])  // trainers only — see backend getPayroll
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState('')
    const [filterType, setFilterType] = useState('all')
    const [search, setSearch] = useState('')

    const [modal, setModal] = useState({ open: false, editing: null })
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState('')
    const [uploadingDoc, setUploadingDoc] = useState(false)

    const [deleteModal, setDeleteModal] = useState({ open: false, member: null })

    const fetchStaff = async () => {
        setLoading(true)
        setLoadError('')
        try {
            const params = {}
            if (filterType !== 'all') params.staffType = filterType
            // Run in parallel — payroll endpoint always returns trainers
            // regardless of the filter, which is what we want (so a
            // Helpdesk-filtered view still has correct data when the user
            // switches back to All / Trainer).
            const [staffRes, payrollRes] = await Promise.all([
                gymStaffService.getAll(params),
                gymStaffService.getPayroll(),
            ])
            setStaff(staffRes.data || [])
            setPayroll(payrollRes.data || [])
        } catch (err) {
            setLoadError(err.response?.data?.message || 'Could not load staff list.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchStaff() }, [filterType])

    // Quick lookup of payroll info by trainer _id, for the table column.
    const payrollById = useMemo(() => {
        const m = new Map()
        for (const p of payroll) m.set(String(p._id), p)
        return m
    }, [payroll])

    const filtered = staff.filter(s => {
        const q = search.trim().toLowerCase()
        if (!q) return true
        return s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
    })

    const openAdd = () => {
        setModal({ open: true, editing: null })
        setForm(emptyForm)
        setFormError('')
    }

    const openEdit = (s) => {
        setModal({ open: true, editing: s })
        setForm({
            staffType: s.staffType || 'Helpdesk',
            name: s.name || '',
            email: s.email || '',
            phone: s.phone || '',
            alternatePhone: s.alternatePhone || '',
            bloodGroup: s.bloodGroup || '',
            maritalStatus: s.maritalStatus || '',
            dateOfBirth: s.dateOfBirth ? String(s.dateOfBirth).substring(0, 10) : '',
            anniversary: s.anniversary ? String(s.anniversary).substring(0, 10) : '',
            healthInsurance: !!s.healthInsurance,
            healthInsuranceNote: s.healthInsuranceNote || '',
            healthInsuranceDocUrl: s.healthInsuranceDocUrl || '',
            aadhaarOnFile: !!s.aadhaarOnFile,
            aadhaarLast4: s.aadhaarLast4 || '',
            panNumber: s.panNumber || '',
            monthlySalary: s.monthlySalary || 0,
            achievements: s.achievements || '',
            isPersonalTrainer: !!s.isPersonalTrainer,
            personalTrainerSalary: s.personalTrainerSalary || 0,
            isActive: s.isActive !== false,
        })
        setFormError('')
    }

    const closeModal = () => setModal({ open: false, editing: null })

    const handleChange = (e) => {
        const { name, type, value, checked } = e.target
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    }

    const handleSave = async () => {
        if (!form.name.trim()) { setFormError('Name is required'); return }
        if (!form.email.trim()) { setFormError('Email is required'); return }
        if (!form.phone.trim()) { setFormError('Phone is required'); return }
        if (!form.staffType) { setFormError('Staff type is required'); return }

        setSaving(true)
        setFormError('')
        try {
            const payload = {
                ...form,
                monthlySalary: Number(form.monthlySalary) || 0,
                personalTrainerSalary: Number(form.personalTrainerSalary) || 0,
            }
            if (!payload.dateOfBirth) delete payload.dateOfBirth
            if (!payload.anniversary) delete payload.anniversary

            if (modal.editing) {
                await gymStaffService.update(modal.editing._id, payload)
                toast.success('Staff member updated')
            } else {
                await gymStaffService.create(payload)
                toast.success('Staff member added')
            }
            closeModal()
            fetchStaff()
        } catch (err) {
            setFormError(err.response?.data?.message || 'Could not save. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteModal.member) return
        try {
            await gymStaffService.delete(deleteModal.member._id)
            toast.success('Staff member removed')
            setDeleteModal({ open: false, member: null })
            fetchStaff()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not delete.')
        }
    }

    // Upload health-insurance document. Only available when editing an
    // existing staff member — for new staff, the user must save first
    // (because we need an _id to attach the file to).
    const handleDocumentUpload = async (e) => {
        const file = e.target.files?.[0]
        // Reset input so the same file can be re-selected after a failure.
        e.target.value = ''
        if (!file) return
        if (!modal.editing) {
            toast.error('Save the staff member first, then upload a document.')
            return
        }
        if (!ALLOWED_DOC_TYPES.includes(file.type)) {
            toast.error('Only PDF, JPG, and PNG files are allowed.')
            return
        }
        if (file.size > MAX_DOC_BYTES) {
            toast.error('File is too large (5 MB max).')
            return
        }
        setUploadingDoc(true)
        try {
            const res = await gymStaffService.uploadDocument(modal.editing._id, file)
            const url = res.data?.healthInsuranceDocUrl || ''
            setForm(prev => ({ ...prev, healthInsuranceDocUrl: url }))
            // Reflect the change in the underlying list too so the modal
            // doesn't lose the URL if it's reopened without a refetch.
            setStaff(prev => prev.map(m => m._id === modal.editing._id ? { ...m, healthInsuranceDocUrl: url } : m))
            setModal(prev => prev.editing
                ? { ...prev, editing: { ...prev.editing, healthInsuranceDocUrl: url } }
                : prev)
            toast.success('Document uploaded')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Upload failed.')
        } finally {
            setUploadingDoc(false)
        }
    }

    const handleDocumentRemove = async () => {
        if (!modal.editing) return
        if (!confirm('Remove this document? This cannot be undone.')) return
        try {
            await gymStaffService.removeDocument(modal.editing._id)
            setForm(prev => ({ ...prev, healthInsuranceDocUrl: '' }))
            setStaff(prev => prev.map(m => m._id === modal.editing._id ? { ...m, healthInsuranceDocUrl: '' } : m))
            setModal(prev => prev.editing
                ? { ...prev, editing: { ...prev.editing, healthInsuranceDocUrl: '' } }
                : prev)
            toast.success('Document removed')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not remove document.')
        }
    }

    const isTrainer = form.staffType === 'Trainer'

    return (
        <AdminLayout>
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Staff</h1>
                        <p className="page-subtitle">Manage helpdesk, trainers and cleaners</p>
                    </div>
                    <button className="btn btn-primary" onClick={openAdd}>+ Add Staff</button>
                </div>

                {loadError && (
                    <ErrorBanner message={loadError} onRetry={fetchStaff} onDismiss={() => setLoadError('')} />
                )}

                {/* Filters */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <input
                        className="form-input"
                        style={{ flex: 1, minWidth: 220 }}
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <select
                        className="form-select"
                        style={{ width: 200 }}
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">All Types</option>
                        {STAFF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                {/* List */}
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-container" style={{ border: 'none' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Phone</th>
                                    <th>Salary</th>
                                    <th>Status</th>
                                    <th style={{ width: 120 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="6" style={{ padding: 40, textAlign: 'center' }}>
                                        <div className="spinner" style={{ margin: '0 auto' }} />
                                    </td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan="6" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                                        {search || filterType !== 'all'
                                            ? 'No staff match your filters.'
                                            : 'No staff yet. Click "Add Staff" to add your first team member.'}
                                    </td></tr>
                                ) : filtered.map(s => (
                                    <tr key={s._id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{
                                                    width: 32, height: 32, borderRadius: '50%',
                                                    background: 'var(--teal-100, #d1fae5)',
                                                    color: 'var(--teal-700, #047857)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 12, fontWeight: 700,
                                                }}>{getInitials(s.name)}</div>
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${TYPE_BADGE[s.staffType] || 'badge-gray'}`}>
                                                {s.staffType}
                                                {s.staffType === 'Trainer' && s.isPersonalTrainer && ' · PT'}
                                            </span>
                                        </td>
                                        <td>{s.phone || '—'}</td>
                                        <td style={{ fontWeight: 600 }}>
                                            {(() => {
                                                const pr = s.staffType === 'Trainer'
                                                    ? payrollById.get(String(s._id))
                                                    : null
                                                // Non-trainer or no payroll info — just show base salary
                                                if (!pr) return formatCurrency(s.monthlySalary || 0)
                                                // Trainer who isn't a PT or has no PT customers — also just base
                                                if (pr.ptComponent === 0) {
                                                    return formatCurrency(pr.totalSalary)
                                                }
                                                // Trainer with PT customers — show total + breakdown
                                                return (
                                                    <div>
                                                        <div>{formatCurrency(pr.totalSalary)}</div>
                                                        <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginTop: 2 }}>
                                                            base {formatCurrency(pr.monthlySalary)}
                                                            {' + '}
                                                            {pr.ptCustomerCount} PT × {formatCurrency(pr.personalTrainerSalary)}
                                                        </div>
                                                    </div>
                                                )
                                            })()}
                                        </td>
                                        <td>
                                            <span className={`badge ${s.isActive ? 'badge-green' : 'badge-gray'}`}>
                                                {s.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="btn-icon" title="Edit" onClick={() => openEdit(s)}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                            </button>
                                            <button
                                                className="btn-icon"
                                                title="Delete"
                                                onClick={() => setDeleteModal({ open: true, member: s })}
                                                style={{ color: '#dc2626', marginLeft: 4 }}
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ── ADD / EDIT MODAL ── */}
            <Modal
                isOpen={modal.open}
                onClose={closeModal}
                title={modal.editing ? 'Edit Staff Member' : 'Add Staff Member'}
                size="lg"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            {saving
                                ? <span className="spinner spinner-white" style={{ width: 16, height: 16 }} />
                                : (modal.editing ? 'Update' : 'Add Staff')}
                        </button>
                    </>
                }
            >
                {formError && <ErrorBanner message={formError} onDismiss={() => setFormError('')} />}

                {/* Section: Type + Active */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Staff Type *</label>
                        <select name="staffType" className="form-select" value={form.staffType} onChange={handleChange}>
                            {STAFF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, paddingTop: 24 }}>
                        <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} id="isActive" />
                        <label htmlFor="isActive" className="form-label" style={{ margin: 0 }}>Active</label>
                    </div>
                </div>

                {/* Section: Basic info */}
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '12px 0 10px' }}>
                    Basic Information
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                        <label className="form-label">Name *</label>
                        <input name="name" className="form-input" value={form.name} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email *</label>
                        <input name="email" type="email" className="form-input" value={form.email} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Phone *</label>
                        <input name="phone" className="form-input" value={form.phone} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Alternate Phone</label>
                        <input name="alternatePhone" className="form-input" value={form.alternatePhone} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Date of Birth</label>
                        <input name="dateOfBirth" type="date" className="form-input" value={form.dateOfBirth} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Blood Group</label>
                        <select name="bloodGroup" className="form-select" value={form.bloodGroup} onChange={handleChange}>
                            <option value="">Select</option>
                            {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Marital Status</label>
                        <select name="maritalStatus" className="form-select" value={form.maritalStatus} onChange={handleChange}>
                            <option value="">Select</option>
                            {MARITAL_STATUSES.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Anniversary</label>
                        <input name="anniversary" type="date" className="form-input" value={form.anniversary} onChange={handleChange}
                            disabled={form.maritalStatus !== 'Married'}
                            title={form.maritalStatus !== 'Married' ? 'Only for married staff' : ''} />
                    </div>
                </div>

                {/* Section: Compliance */}
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '20px 0 10px' }}>
                    Compliance & Identity
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, paddingTop: 24 }}>
                        <input type="checkbox" name="healthInsurance" checked={form.healthInsurance} onChange={handleChange} id="healthIns" />
                        <label htmlFor="healthIns" className="form-label" style={{ margin: 0 }}>Health Insurance</label>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Insurance Note (or doc URL)</label>
                        <input name="healthInsuranceNote" className="form-input" value={form.healthInsuranceNote}
                            onChange={handleChange} disabled={!form.healthInsurance}
                            placeholder="Policy number / link" />
                    </div>
                    {/* Health-insurance document upload — only meaningful for an
                        existing staff member, since uploads need an _id to attach to. */}
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Insurance Document (PDF, JPG, PNG · max 5 MB)</label>
                        {!modal.editing ? (
                            <div style={{
                                fontSize: 13, color: 'var(--text-muted)',
                                padding: '10px 12px',
                                background: 'var(--bg-secondary)',
                                border: '1px dashed var(--border)',
                                borderRadius: 'var(--radius)',
                            }}>
                                Save the staff member first, then upload an insurance document.
                            </div>
                        ) : form.healthInsuranceDocUrl ? (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 12px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)',
                            }}>
                                <span style={{ fontSize: 18 }}>📄</span>
                                <a
                                    href={fileUrl(form.healthInsuranceDocUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ flex: 1, fontSize: 13, color: 'var(--primary, #10B981)', fontWeight: 500 }}
                                >
                                    View uploaded document
                                </a>
                                <label className="btn btn-secondary btn-sm" style={{ margin: 0, cursor: uploadingDoc ? 'wait' : 'pointer' }}>
                                    {uploadingDoc ? 'Uploading…' : 'Replace'}
                                    <input
                                        type="file"
                                        accept="application/pdf,image/jpeg,image/png"
                                        style={{ display: 'none' }}
                                        onChange={handleDocumentUpload}
                                        disabled={uploadingDoc}
                                    />
                                </label>
                                <button
                                    type="button"
                                    className="btn btn-sm"
                                    style={{ color: '#dc2626', background: 'transparent', border: '1px solid #fca5a5' }}
                                    onClick={handleDocumentRemove}
                                    disabled={uploadingDoc}
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <label
                                className="btn btn-secondary"
                                style={{
                                    margin: 0,
                                    cursor: uploadingDoc ? 'wait' : 'pointer',
                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                }}
                            >
                                {uploadingDoc ? (
                                    <>
                                        <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                        Uploading…
                                    </>
                                ) : (
                                    <>📎 Upload document</>
                                )}
                                <input
                                    type="file"
                                    accept="application/pdf,image/jpeg,image/png"
                                    style={{ display: 'none' }}
                                    onChange={handleDocumentUpload}
                                    disabled={uploadingDoc}
                                />
                            </label>
                        )}
                    </div>
                    <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, paddingTop: 24 }}>
                        <input type="checkbox" name="aadhaarOnFile" checked={form.aadhaarOnFile} onChange={handleChange} id="aadhaar" />
                        <label htmlFor="aadhaar" className="form-label" style={{ margin: 0 }}>Aadhaar on file</label>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Aadhaar (last 4)</label>
                        <input name="aadhaarLast4" className="form-input" value={form.aadhaarLast4}
                            onChange={handleChange} maxLength={4} disabled={!form.aadhaarOnFile} placeholder="XXXX" />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">PAN Number</label>
                        <input name="panNumber" className="form-input" value={form.panNumber}
                            onChange={handleChange} placeholder="ABCDE1234F" maxLength={10} />
                    </div>
                </div>

                {/* Section: Compensation */}
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '20px 0 10px' }}>
                    Compensation
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                        <label className="form-label">Monthly Salary (₹)</label>
                        <input name="monthlySalary" type="number" className="form-input" value={form.monthlySalary}
                            onChange={handleChange} min="0" />
                    </div>
                </div>

                {/* Section: Trainer-specific */}
                {isTrainer && (
                    <>
                        <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal-700, #047857)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '20px 0 10px' }}>
                            Trainer Details
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Achievements</label>
                                <textarea name="achievements" className="form-textarea" rows={2}
                                    value={form.achievements} onChange={handleChange}
                                    placeholder="Certifications, competitions, specialties..." />
                            </div>
                            <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, paddingTop: 24 }}>
                                <input type="checkbox" name="isPersonalTrainer" checked={form.isPersonalTrainer}
                                    onChange={handleChange} id="isPT" />
                                <label htmlFor="isPT" className="form-label" style={{ margin: 0 }}>Available as Personal Trainer</label>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Personal Trainer Salary (₹/month)</label>
                                <input name="personalTrainerSalary" type="number" className="form-input"
                                    value={form.personalTrainerSalary} onChange={handleChange}
                                    min="0" disabled={!form.isPersonalTrainer}
                                    title={!form.isPersonalTrainer ? 'Enable PT first' : ''} />
                            </div>
                        </div>

                        {/* Live payroll breakdown — only when editing an existing
                            trainer (the data comes from /payroll, which is keyed
                            by _id and returned at page-load time). */}
                        {modal.editing && (() => {
                            const pr = payrollById.get(String(modal.editing._id))
                            if (!pr) return null
                            return (
                                <div style={{
                                    marginTop: 14,
                                    padding: '12px 14px',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius)',
                                }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                                        Computed Total Salary
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 13 }}>
                                        <div style={{ color: 'var(--text-muted)' }}>Base salary</div>
                                        <div style={{ textAlign: 'right' }}>{formatCurrency(pr.monthlySalary)}</div>
                                        <div style={{ color: 'var(--text-muted)' }}>
                                            PT customers assigned
                                        </div>
                                        <div style={{ textAlign: 'right' }}>{pr.ptCustomerCount}</div>
                                        <div style={{ color: 'var(--text-muted)' }}>
                                            PT component ({pr.ptCustomerCount} × {formatCurrency(pr.personalTrainerSalary)})
                                        </div>
                                        <div style={{ textAlign: 'right' }}>{formatCurrency(pr.ptComponent)}</div>
                                        <div style={{
                                            gridColumn: '1 / -1',
                                            borderTop: '1px solid var(--border)',
                                            margin: '4px 0',
                                        }} />
                                        <div style={{ fontWeight: 600 }}>Total monthly</div>
                                        <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary, #10B981)' }}>
                                            {formatCurrency(pr.totalSalary)}
                                        </div>
                                    </div>
                                    <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.4 }}>
                                        Numbers reflect the most recent page load. Save salary changes and reopen this modal to recalculate.
                                    </p>
                                </div>
                            )
                        })()}
                    </>
                )}
            </Modal>

            {/* ── DELETE CONFIRMATION ── */}
            <Modal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, member: null })}
                title="Remove staff member?"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setDeleteModal({ open: false, member: null })}>Cancel</button>
                        <button className="btn" style={{ background: '#dc2626', color: '#fff' }} onClick={handleDelete}>Remove</button>
                    </>
                }
            >
                <p>Are you sure you want to remove <strong>{deleteModal.member?.name}</strong>? This cannot be undone.</p>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 8 }}>
                    Note: customers assigned to this trainer will need to be re-assigned.
                </p>
            </Modal>
        </AdminLayout>
    )
}

export default Staff
