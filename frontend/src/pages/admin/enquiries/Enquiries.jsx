import { useState, useEffect } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import Modal from '../../../components/shared/Modal'
import Pagination from '../../../components/shared/Pagination'
import { enquiryService } from '../../../services/enquiryService'
import { formatDate, getStatusClass } from '../../../utils/helpers'
import './enquiries.css'

const emptyForm = {
    name: '', phone: '', email: '',
    source: '', interestedIn: '', status: 'new', notes: '',
}
const ITEMS_PER_PAGE = 8

function Enquiries() {
    const [enquiries, setEnquiries] = useState([])
    const [stats, setStats] = useState({ new: 0, 'follow-up': 0, converted: 0, lost: 0 })
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [page, setPage] = useState(1)
    const [modal, setModal] = useState({ open: false, editing: null })
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [deleteModal, setDeleteModal] = useState({ open: false, enquiry: null })
    const [deleting, setDeleting] = useState(false)

    const fetchAll = async () => {
        setLoading(true)
        try {
            const params = { page, limit: ITEMS_PER_PAGE }
            if (search) params.search = search
            if (filterStatus !== 'all') params.status = filterStatus

            const [enquiriesRes, statsRes] = await Promise.all([
                enquiryService.getAll(params),
                enquiryService.getStats(),
            ])
            setEnquiries(enquiriesRes.data)
            setTotal(enquiriesRes.pagination.total)
            setStats(statsRes.data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchAll() }, [page, filterStatus])

    useEffect(() => {
        const timer = setTimeout(() => { setPage(1); fetchAll() }, 400)
        return () => clearTimeout(timer)
    }, [search])

    const openAdd = () => { setForm(emptyForm); setModal({ open: true, editing: null }) }
    const openEdit = (e) => { setForm({ ...e }); setModal({ open: true, editing: e }) }

    const handleSave = async () => {
        setSaving(true)
        try {
            if (modal.editing) {
                await enquiryService.update(modal.editing._id, form)
            } else {
                await enquiryService.create(form)
            }
            setModal({ open: false, editing: null })
            fetchAll()
        } catch (err) {
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await enquiryService.delete(deleteModal.enquiry._id)
            setDeleteModal({ open: false, enquiry: null })
            fetchAll()
        } catch (err) {
            console.error(err)
        } finally {
            setDeleting(false)
        }
    }

    const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

    return (
        <AdminLayout>
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Enquiries</h1>
                        <p className="page-subtitle">Manage leads and potential members</p>
                    </div>
                    <button className="btn btn-primary" onClick={openAdd}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Enquiry
                    </button>
                </div>

                {/* Status Summary */}
                <div className="enquiry-summary">
                    {[
                        { label: 'New', key: 'new', color: 'info' },
                        { label: 'Follow-up', key: 'follow-up', color: 'warning' },
                        { label: 'Converted', key: 'converted', color: 'success' },
                        { label: 'Lost', key: 'lost', color: 'danger' },
                    ].map((s) => (
                        <div key={s.key}
                            className={`enquiry-summary-card enquiry-summary-${s.color}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => { setFilterStatus(s.key); setPage(1) }}>
                            <p className="enquiry-summary-count">{stats[s.key] || 0}</p>
                            <p className="enquiry-summary-label">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="filter-bar">
                    <div className="search-input-wrapper">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input type="text" className="search-input"
                            placeholder="Search by name or phone..."
                            value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <select className="form-select" style={{ width: 160 }} value={filterStatus}
                        onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}>
                        <option value="all">All Status</option>
                        <option value="new">New</option>
                        <option value="follow-up">Follow-up</option>
                        <option value="converted">Converted</option>
                        <option value="lost">Lost</option>
                    </select>
                    {filterStatus !== 'all' && (
                        <button className="btn btn-secondary btn-sm"
                            onClick={() => { setFilterStatus('all'); setPage(1) }}>
                            Clear Filter
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-container" style={{ border: 'none' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th><th>Contact</th><th>Date</th>
                                    <th>Source</th><th>Interested In</th><th>Status</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="7">
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                                            <div className="spinner" />
                                        </div>
                                    </td></tr>
                                ) : enquiries.length === 0 ? (
                                    <tr><td colSpan="7">
                                        <div className="empty-state">
                                            <h3>No enquiries found</h3>
                                            <p>Add your first enquiry or adjust your filters</p>
                                        </div>
                                    </td></tr>
                                ) : enquiries.map((e) => (
                                    <tr key={e._id}>
                                        <td style={{ fontWeight: 500 }}>{e.name}</td>
                                        <td>
                                            <p style={{ fontSize: 13 }}>{e.phone}</p>
                                            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.email}</p>
                                        </td>
                                        <td style={{ fontSize: 13 }}>{formatDate(e.createdAt)}</td>
                                        <td><span className="badge badge-info">{e.source}</span></td>
                                        <td><span className="badge badge-purple">{e.interestedIn}</span></td>
                                        <td>
                                            <span className={`badge ${getStatusClass(e.status)}`}>{e.status}</span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn-icon" title="Edit" onClick={() => openEdit(e)}>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                </button>
                                                <button className="btn-icon" title="Delete"
                                                    style={{ color: 'var(--danger)' }}
                                                    onClick={() => setDeleteModal({ open: true, enquiry: e })}>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="3 6 5 6 21 6" />
                                                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination page={page} totalPages={totalPages}
                        totalItems={total} onPageChange={setPage} />
                </div>

                {/* Add/Edit Modal */}
                <Modal
                    isOpen={modal.open}
                    onClose={() => setModal({ open: false, editing: null })}
                    title={modal.editing ? 'Edit Enquiry' : 'Add Enquiry'}
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
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Full Name *</label>
                            <input className="form-input" placeholder="Name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone *</label>
                            <input className="form-input" placeholder="Phone number"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input type="email" className="form-input" placeholder="Email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Source</label>
                            <select className="form-select" value={form.source}
                                onChange={(e) => setForm({ ...form, source: e.target.value })}>
                                <option value="">Select source</option>
                                <option>Walk-in</option>
                                <option>Website</option>
                                <option>Referral</option>
                                <option>Call</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Interested In</label>
                            <select className="form-select" value={form.interestedIn}
                                onChange={(e) => setForm({ ...form, interestedIn: e.target.value })}>
                                <option value="">Select plan</option>
                                <option>Basic</option>
                                <option>Standard</option>
                                <option>Premium</option>
                                <option>Elite</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select className="form-select" value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                <option value="new">New</option>
                                <option value="follow-up">Follow-up</option>
                                <option value="converted">Converted</option>
                                <option value="lost">Lost</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea className="form-textarea" rows={2} placeholder="Any notes..."
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>
                </Modal>

                {/* Delete Modal */}
                <Modal
                    isOpen={deleteModal.open}
                    onClose={() => setDeleteModal({ open: false, enquiry: null })}
                    title="Delete Enquiry"
                    footer={
                        <>
                            <button className="btn btn-secondary"
                                onClick={() => setDeleteModal({ open: false, enquiry: null })}>Cancel</button>
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
                        <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
                        <p>Delete enquiry from <strong>{deleteModal.enquiry?.name}</strong>?</p>
                    </div>
                </Modal>
            </div>
        </AdminLayout>
    )
}

export default Enquiries