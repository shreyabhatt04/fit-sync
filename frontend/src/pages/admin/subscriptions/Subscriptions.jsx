import { useState, useEffect } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import Modal from '../../../components/shared/Modal'
import Pagination from '../../../components/shared/Pagination'
import { useToast } from '../../../context/ToastContext'
import { subscriptionService } from '../../../services/subscriptionService'
import { membershipService } from '../../../services/membershipService'
import { customerService } from '../../../services/customerService'
import { formatDate, formatCurrency, getInitials, getStatusClass } from '../../../utils/helpers'
import './subscriptions.css'

const ITEMS_PER_PAGE = 8

const emptyForm = { customer: '', membership: '', startDate: '', notes: '' }

function Subscriptions() {
    const toast = useToast()

    const [subscriptions, setSubscriptions] = useState([])
    const [customers, setCustomers] = useState([])
    const [memberships, setMemberships] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState('all')
    const [page, setPage] = useState(1)

    // modal state — editing holds the subscription being edited (null = add mode)
    const [modal, setModal] = useState({ open: false, editing: null })
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState('')
    const [form, setForm] = useState(emptyForm)

    // ─── Batch 9d: Amount adjustment modal ───
    const [adjustModal, setAdjustModal] = useState({ open: false, sub: null })
    const [adjustAmount, setAdjustAmount] = useState('')
    const [adjustSaving, setAdjustSaving] = useState(false)
    const [adjustError, setAdjustError] = useState('')

    const openAdjust = (sub) => {
        setAdjustModal({ open: true, sub })
        setAdjustAmount(String(sub.amount || ''))
        setAdjustError('')
    }
    const closeAdjust = () => setAdjustModal({ open: false, sub: null })

    const handleAdjustSave = async () => {
        const num = Number(adjustAmount)
        if (!adjustAmount || Number.isNaN(num) || num <= 0) {
            setAdjustError('Please enter a valid amount greater than zero.')
            return
        }
        if (!adjustModal.sub) return

        setAdjustSaving(true)
        setAdjustError('')
        try {
            await subscriptionService.update(adjustModal.sub._id, { amount: num })
            toast.success(`Amount updated to ${formatCurrency(num)}. Future payments will use this amount.`)
            closeAdjust()
            fetchSubscriptions()
        } catch (err) {
            setAdjustError(err.response?.data?.message || 'Could not update amount. Please try again.')
        } finally {
            setAdjustSaving(false)
        }
    }

    const fetchSubscriptions = async () => {
        setLoading(true)
        try {
            const params = { page, limit: ITEMS_PER_PAGE }
            if (filterStatus !== 'all') params.status = filterStatus
            const res = await subscriptionService.getAll(params)
            setSubscriptions(res.data)
            setTotal(res.pagination.total)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const fetchDropdownData = async () => {
        try {
            const [custRes, memRes] = await Promise.all([
                customerService.getAll({ limit: 200 }),
                membershipService.getAll(),
            ])
            setCustomers(custRes.data)
            setMemberships(memRes.data)
        } catch (err) {
            console.error(err)
        }
    }

    useEffect(() => { fetchSubscriptions() }, [page, filterStatus])
    useEffect(() => { fetchDropdownData() }, [])

    // Open modal in ADD mode
    const openAdd = () => {
        setForm(emptyForm)
        setFormError('')
        setModal({ open: true, editing: null })
    }

    // Open modal in EDIT mode — pre-fill from the subscription row
    const openEdit = (sub) => {
        setForm({
            customer: sub.customer?._id || '',
            membership: sub.membership?._id || '',
            startDate: sub.startDate ? sub.startDate.split('T')[0] : '',
            notes: sub.notes || '',
            // also carry status and endDate for editing
            status: sub.status || 'active',
            endDate: sub.endDate ? sub.endDate.split('T')[0] : '',
        })
        setFormError('')
        setModal({ open: true, editing: sub })
    }

    const closeModal = () => {
        setModal({ open: false, editing: null })
        setForm(emptyForm)
        setFormError('')
    }

    // Calculate end date from start date + membership duration
    const calcEndDate = (startDateStr, membershipId) => {
        const selectedMembership = memberships.find(m => m._id === membershipId)
        if (!selectedMembership || !startDateStr) return ''
        const durationMap = { '1 Month': 1, '3 Months': 3, '6 Months': 6, '1 Year': 12 }
        const months = durationMap[selectedMembership.duration] || 1
        const end = new Date(startDateStr)
        end.setMonth(end.getMonth() + months)
        return end.toISOString().split('T')[0]
    }

    const handleSave = async () => {
        if (!form.customer || !form.membership || !form.startDate) {
            setFormError('Member, plan and start date are required')
            return
        }
        setSaving(true)
        setFormError('')
        try {
            const selectedMembership = memberships.find(m => m._id === form.membership)
            const isEditMode = !!modal.editing

            if (isEditMode) {
                // UPDATE — only allow changing status, end date, and notes
                await subscriptionService.update(modal.editing._id, {
                    status: form.status,
                    endDate: form.endDate,
                    notes: form.notes,
                })
            } else {
                // CREATE — calculate end date automatically from plan duration
                const endDate = calcEndDate(form.startDate, form.membership)
                await subscriptionService.create({
                    customer: form.customer,
                    membership: form.membership,
                    startDate: form.startDate,
                    endDate,
                    amount: selectedMembership?.price || 0,
                    notes: form.notes,
                })
            }

            closeModal()
            fetchSubscriptions()
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to save subscription')
        } finally {
            setSaving(false)
        }
    }

    const totalPages = Math.ceil(total / ITEMS_PER_PAGE)
    const activeCount = subscriptions.filter(s => s.status === 'active').length
    const expiredCount = subscriptions.filter(s => s.status === 'expired').length
    const isEditMode = !!modal.editing

    const planColors = {
        Basic: 'badge-gray', Standard: 'badge-info',
        Premium: 'badge-purple', Elite: 'badge-orange',
    }

    return (
        <AdminLayout>
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Subscriptions</h1>
                        <p className="page-subtitle">{total} total subscriptions</p>
                    </div>
                    <button className="btn btn-primary" onClick={openAdd}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Subscription
                    </button>
                </div>

                {/* Summary chips */}
                <div className="subscriptions-summary">
                    {[
                        { label: 'Total', value: total, color: 'var(--primary)', bg: 'var(--primary-light)' },
                        { label: 'Active', value: activeCount, color: 'var(--success)', bg: 'var(--success-light)' },
                        { label: 'Expired', value: expiredCount, color: 'var(--danger)', bg: 'var(--danger-light)' },
                    ].map((s) => (
                        <div key={s.label} className="summary-chip" style={{ background: s.bg }}>
                            <span className="summary-val" style={{ color: s.color }}>{s.value}</span>
                            <span className="summary-label" style={{ color: s.color }}>{s.label}</span>
                        </div>
                    ))}
                </div>

                {/* Filter */}
                <div className="filter-bar">
                    <select className="form-select" style={{ width: 150 }} value={filterStatus}
                        onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}>
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>

                {/* Table */}
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-container" style={{ border: 'none' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Member</th><th>Plan</th><th>Start Date</th>
                                    <th>End Date</th><th>Amount</th><th>Status</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="7">
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                                            <div className="spinner" />
                                        </div>
                                    </td></tr>
                                ) : subscriptions.length === 0 ? (
                                    <tr><td colSpan="7">
                                        <div className="empty-state"><h3>No subscriptions found</h3></div>
                                    </td></tr>
                                ) : subscriptions.map((s) => (
                                    <tr key={s._id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="avatar" style={{ background: '#f2f2f2', color: '#2b2b2b' }}>
                                                    {getInitials(`${s.customer?.firstName || ''} ${s.customer?.lastName || ''}`)}
                                                </div>
                                                <span>{s.customer?.firstName} {s.customer?.lastName}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${planColors[s.membership?.name] || 'badge-gray'}`}>
                                                {s.membership?.name}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 13 }}>{formatDate(s.startDate)}</td>
                                        <td style={{ fontSize: 13 }}>{formatDate(s.endDate)}</td>
                                        <td style={{ fontWeight: 600 }}>{formatCurrency(s.amount)}</td>
                                        <td>
                                            <span className={`badge ${getStatusClass(s.status)}`}>{s.status}</span>
                                        </td>
                                        <td>
                                            {/* Adjust amount — Batch 9d */}
                                            <button
                                                className="btn-icon"
                                                title="Adjust amount (change future billing)"
                                                onClick={() => openAdjust(s)}
                                                style={{ marginRight: 4 }}
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <line x1="12" y1="2" x2="12" y2="22" />
                                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                                </svg>
                                            </button>
                                            {/* Edit button — only useful for active/pending subscriptions */}
                                            <button
                                                className="btn-icon"
                                                title="Edit"
                                                onClick={() => openEdit(s)}
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination page={page} totalPages={totalPages}
                        totalItems={total} onPageChange={setPage} />
                </div>

                {/* Add / Edit Modal */}
                <Modal
                    isOpen={modal.open}
                    onClose={closeModal}
                    title={isEditMode ? 'Edit Subscription' : 'Add Subscription'}
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving
                                    ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                    : isEditMode ? 'Update' : 'Save'
                                }
                            </button>
                        </>
                    }
                >
                    {formError && (
                        <div className="alert alert-danger" style={{ marginBottom: 12 }}>
                            {formError}
                        </div>
                    )}

                    {isEditMode ? (
                        /* ── EDIT MODE — only allow changing status, end date, notes ── */
                        <>
                            {/* Read-only info */}
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                                <strong style={{ color: 'var(--text-primary)' }}>
                                    {modal.editing?.customer?.firstName} {modal.editing?.customer?.lastName}
                                </strong>
                                {' · '}
                                {modal.editing?.membership?.name}
                                {' · '}
                                Started {formatDate(modal.editing?.startDate)}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-select" value={form.status}
                                        onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                        <option value="active">Active</option>
                                        <option value="expired">Expired</option>
                                        <option value="cancelled">Cancelled</option>
                                        <option value="pending">Pending</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">End Date</label>
                                    <input type="date" className="form-input"
                                        value={form.endDate}
                                        onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea className="form-textarea" rows={2} placeholder="Optional notes"
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                            </div>
                        </>
                    ) : (
                        /* ── ADD MODE — full form ── */
                        <>
                            <div className="form-group">
                                <label className="form-label">Select Member *</label>
                                <select className="form-select" value={form.customer}
                                    onChange={(e) => setForm({ ...form, customer: e.target.value })}>
                                    <option value="">Choose a member</option>
                                    {customers.map(c => (
                                        <option key={c._id} value={c._id}>
                                            {c.firstName} {c.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Membership Plan *</label>
                                    <select className="form-select" value={form.membership}
                                        onChange={(e) => setForm({ ...form, membership: e.target.value })}>
                                        <option value="">Choose a plan</option>
                                        {memberships.map(m => (
                                            <option key={m._id} value={m._id}>
                                                {m.name} — {formatCurrency(m.price)} ({m.duration})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Start Date *</label>
                                    <input type="date" className="form-input"
                                        value={form.startDate}
                                        onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                                </div>
                            </div>
                            {/* Show calculated end date as a preview */}
                            {form.startDate && form.membership && (
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, marginTop: -8 }}>
                                    End date will be: <strong>{formatDate(calcEndDate(form.startDate, form.membership))}</strong>
                                </p>
                            )}
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea className="form-textarea" rows={2} placeholder="Optional notes"
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                            </div>
                        </>
                    )}
                </Modal>

                {/* ─── Batch 9d: Amount Adjustment Modal ─── */}
                <Modal
                    isOpen={adjustModal.open}
                    onClose={closeAdjust}
                    title="Adjust Subscription Amount"
                    footer={
                        <>
                            <button
                                className="btn btn-secondary"
                                onClick={closeAdjust}
                                disabled={adjustSaving}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleAdjustSave}
                                disabled={adjustSaving}
                            >
                                {adjustSaving
                                    ? <span className="spinner spinner-white" style={{ width: 16, height: 16 }} />
                                    : 'Save New Amount'}
                            </button>
                        </>
                    }
                >
                    {adjustModal.sub && (
                        <>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                                Update the subscription amount for{' '}
                                <strong style={{ color: 'var(--text-primary)' }}>
                                    {adjustModal.sub.customer?.firstName} {adjustModal.sub.customer?.lastName}
                                </strong>.
                                This changes the billing amount going forward — past payment records are not affected.
                            </p>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 12,
                                padding: 14,
                                marginBottom: 16,
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)',
                            }}>
                                <div>
                                    <p style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>
                                        Current Amount
                                    </p>
                                    <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {formatCurrency(adjustModal.sub.amount)}
                                    </p>
                                </div>
                                <div>
                                    <p style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>
                                        Plan
                                    </p>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {adjustModal.sub.membership?.name || '—'}
                                    </p>
                                </div>
                            </div>

                            {adjustError && (
                                <div className="alert alert-danger" style={{ marginBottom: 12 }}>
                                    {adjustError}
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">New Amount (₹) *</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={adjustAmount}
                                    onChange={(e) => setAdjustAmount(e.target.value)}
                                    placeholder="Enter new amount"
                                    min="0"
                                    step="1"
                                    autoFocus
                                />
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                                    Example: if the current amount is ₹1000 and you want future payments
                                    to be ₹900, enter 900. Payments already recorded keep their original amounts.
                                </p>
                            </div>
                        </>
                    )}
                </Modal>
            </div>
        </AdminLayout>
    )
}

export default Subscriptions