// frontend/src/pages/superadmin/SuperadminBilling.jsx — Batch 17
//
// Lists every PlatformInvoice (FitSync's billing of gyms). Includes:
//   - 4 stat cards (paid this month, paid this year, open, overdue)
//   - Filter bar (gym, status, date range)
//   - Paginated table with row actions: View / Mark Paid / Delete
//   - View modal with full invoice detail
//   - Mark-paid modal that captures payment mode + paid date

import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import SuperadminLayout from './SuperadminLayout'
import './superadmin.css'

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const STATUS_BADGE = {
    paid:      'badge-success',
    due:       'badge-warning',
    overdue:   'badge-danger',
    cancelled: 'badge-gray',
}

const PAYMENT_MODES = ['Bank Transfer', 'UPI', 'Card', 'Cash', 'Other']

export default function SuperadminBilling() {
    const [invoices,   setInvoices]   = useState([])
    const [pagination, setPagination] = useState({})
    const [stats,      setStats]      = useState(null)
    const [companies,  setCompanies]  = useState([])
    const [loading,    setLoading]    = useState(true)

    const [filters, setFilters] = useState({
        companyId: '',
        status:    '',
        from:      '',
        to:        '',
        page:      1,
    })

    const [viewModal, setViewModal] = useState({ open: false, invoice: null })
    const [paidModal, setPaidModal] = useState({ open: false, invoice: null })
    const [paidForm,  setPaidForm]  = useState({ paidAt: '', paymentMode: 'Bank Transfer' })
    const [savingPaid, setSavingPaid] = useState(false)

    // Load gyms once for the filter dropdown — limit 200 covers any realistic
    // gym count for a college-project demo, and avoids paginating the dropdown.
    useEffect(() => {
        api.get('/superadmin/companies?limit=200')
            .then(res => setCompanies(res.data.data || []))
            .catch(err => console.error('Could not load companies:', err))
    }, [])

    // Load invoices + stats together. Stats are global (don't react to
    // filters) so the user always sees the headline platform numbers.
    const load = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (filters.companyId) params.set('companyId', filters.companyId)
            if (filters.status)    params.set('status',    filters.status)
            if (filters.from)      params.set('from',      filters.from)
            if (filters.to)        params.set('to',        filters.to)
            params.set('page',  filters.page)
            params.set('limit', 15)

            const [invRes, statsRes] = await Promise.all([
                api.get(`/superadmin/platform-invoices?${params}`),
                api.get('/superadmin/platform-invoices/stats'),
            ])
            setInvoices(invRes.data.data || [])
            setPagination(invRes.data.pagination || {})
            setStats(statsRes.data.data)
        } catch (err) {
            console.error('[SuperadminBilling] load failed:', err)
        } finally {
            setLoading(false)
        }
    }, [filters])

    useEffect(() => { load() }, [load])

    const updateFilter = (k, v) => setFilters(f => ({ ...f, [k]: v, page: 1 }))

    // Open the mark-paid modal pre-filled with today's date
    const openMarkPaid = (inv) => {
        setPaidModal({ open: true, invoice: inv })
        setPaidForm({
            paidAt: new Date().toISOString().slice(0, 10),
            paymentMode: inv.paymentMode || 'Bank Transfer',
        })
    }

    const submitMarkPaid = async () => {
        if (!paidModal.invoice) return
        setSavingPaid(true)
        try {
            await api.patch(`/superadmin/platform-invoices/${paidModal.invoice._id}`, {
                status: 'paid',
                paidAt: paidForm.paidAt,
                paymentMode: paidForm.paymentMode,
            })
            setPaidModal({ open: false, invoice: null })
            await load()
        } catch (err) {
            alert(err.response?.data?.message || 'Could not mark as paid.')
        } finally {
            setSavingPaid(false)
        }
    }

    const handleDelete = async (inv) => {
        if (!confirm(`Delete invoice ${inv.invoiceNumber}? This cannot be undone.`)) return
        try {
            await api.delete(`/superadmin/platform-invoices/${inv._id}`)
            await load()
        } catch (err) {
            alert(err.response?.data?.message || 'Could not delete.')
        }
    }

    const statCards = stats ? [
        { label: 'Paid this Month', value: fmt(stats.paidThisMonth), color: 'success' },
        { label: 'Paid this Year',  value: fmt(stats.paidThisYear),  color: 'default' },
        { label: 'Open Due',        value: stats.openDue,            sub: 'invoices', color: 'warning' },
        { label: 'Overdue',         value: stats.overdue,            sub: 'invoices', color: 'danger'  },
    ] : []

    return (
        <SuperadminLayout title="Platform Billing">
            <div className="sa-page">

                {/* Stat cards */}
                {stats && (
                    <div className="sa-stats-grid">
                        {statCards.map(s => (
                            <div key={s.label} className={`sa-stat-card sa-stat-card--${s.color}`}>
                                <p className="sa-stat-label">{s.label}</p>
                                <p className="sa-stat-value">{s.value}</p>
                                {s.sub && <p className="sa-stat-sub">{s.sub}</p>}
                            </div>
                        ))}
                    </div>
                )}

                {/* Filter bar */}
                <div className="card" style={{ padding: 16 }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(160px, 1fr) minmax(140px, 1fr) minmax(140px, 1fr) minmax(140px, 1fr) auto',
                        gap: 12,
                        alignItems: 'end',
                    }}>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Gym</label>
                            <select className="form-select" value={filters.companyId}
                                onChange={e => updateFilter('companyId', e.target.value)}>
                                <option value="">All gyms</option>
                                {companies.map(c => (
                                    <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Status</label>
                            <select className="form-select" value={filters.status}
                                onChange={e => updateFilter('status', e.target.value)}>
                                <option value="">All statuses</option>
                                <option value="paid">Paid</option>
                                <option value="due">Due</option>
                                <option value="overdue">Overdue</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">From</label>
                            <input type="date" className="form-input"
                                value={filters.from} onChange={e => updateFilter('from', e.target.value)} />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">To</label>
                            <input type="date" className="form-input"
                                value={filters.to} onChange={e => updateFilter('to', e.target.value)} />
                        </div>
                        <button className="btn btn-secondary btn-sm"
                            onClick={() => setFilters({ companyId: '', status: '', from: '', to: '', page: 1 })}>
                            Clear
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="card" style={{ padding: 0 }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                            <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
                        </div>
                    ) : invoices.length === 0 ? (
                        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                            <p style={{ fontSize: 14 }}>No platform invoices match these filters.</p>
                            <p style={{ fontSize: 12, marginTop: 4 }}>
                                If this is a fresh database, run <code>node backend/scripts/seedPlatformInvoices.js</code> to populate demo data.
                            </p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th>Invoice No.</th>
                                        <th>Gym</th>
                                        <th>Period</th>
                                        <th>Issued</th>
                                        <th>Due</th>
                                        <th style={{ textAlign: 'right' }}>Total</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map(inv => (
                                        <tr key={inv._id}>
                                            <td style={{ fontWeight: 600, color: 'var(--primary, #10B981)', fontSize: 13 }}>
                                                {inv.invoiceNumber}
                                            </td>
                                            <td>{inv.companyId?.name || '—'}</td>
                                            <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                                                {fmtDate(inv.billingPeriodStart)} – {fmtDate(inv.billingPeriodEnd)}
                                            </td>
                                            <td style={{ fontSize: 13 }}>{fmtDate(inv.issuedAt)}</td>
                                            <td style={{ fontSize: 13 }}>{fmtDate(inv.dueDate)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(inv.total)}</td>
                                            <td>
                                                <span className={`badge ${STATUS_BADGE[inv.status]}`}>{inv.status}</span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn-secondary btn-sm"
                                                        onClick={() => setViewModal({ open: true, invoice: inv })}>
                                                        View
                                                    </button>
                                                    {(inv.status === 'due' || inv.status === 'overdue') && (
                                                        <button className="btn btn-primary btn-sm"
                                                            onClick={() => openMarkPaid(inv)}>
                                                            Mark Paid
                                                        </button>
                                                    )}
                                                    <button className="btn btn-sm"
                                                        style={{ color: '#dc2626', background: 'transparent', border: '1px solid #fca5a5' }}
                                                        onClick={() => handleDelete(inv)}>
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination — same minimal pattern as SuperadminSubscriptions */}
                    {pagination.pages > 1 && (
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '12px 16px', borderTop: '1px solid var(--border)',
                            fontSize: 13,
                        }}>
                            <span>
                                Page {pagination.page} of {pagination.pages} · {pagination.total} invoice{pagination.total !== 1 ? 's' : ''}
                            </span>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-secondary btn-sm"
                                    disabled={filters.page <= 1}
                                    onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>
                                    Previous
                                </button>
                                <button className="btn btn-secondary btn-sm"
                                    disabled={filters.page >= pagination.pages}
                                    onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* View modal */}
            {viewModal.open && viewModal.invoice && (
                <ModalShell title={`Invoice ${viewModal.invoice.invoiceNumber}`}
                    onClose={() => setViewModal({ open: false, invoice: null })}>
                    <ViewInvoiceContent invoice={viewModal.invoice} />
                </ModalShell>
            )}

            {/* Mark-paid modal */}
            {paidModal.open && paidModal.invoice && (
                <ModalShell title={`Mark ${paidModal.invoice.invoiceNumber} as paid`}
                    onClose={() => setPaidModal({ open: false, invoice: null })}>
                    <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--text-muted)' }}>
                        Recording payment of <strong style={{ color: 'var(--text-primary)' }}>{fmt(paidModal.invoice.total)}</strong> from {paidModal.invoice.companyId?.name}.
                    </div>
                    <div className="form-group">
                        <label className="form-label">Payment date</label>
                        <input type="date" className="form-input" value={paidForm.paidAt}
                            onChange={e => setPaidForm(f => ({ ...f, paidAt: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Payment mode</label>
                        <select className="form-select" value={paidForm.paymentMode}
                            onChange={e => setPaidForm(f => ({ ...f, paymentMode: e.target.value }))}>
                            {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                        <button className="btn btn-secondary"
                            onClick={() => setPaidModal({ open: false, invoice: null })}>
                            Cancel
                        </button>
                        <button className="btn btn-primary"
                            disabled={savingPaid}
                            onClick={submitMarkPaid}>
                            {savingPaid ? 'Saving…' : 'Mark Paid'}
                        </button>
                    </div>
                </ModalShell>
            )}
        </SuperadminLayout>
    )
}

// Lightweight modal shell — superadmin pages don't reuse the admin Modal
// component (different layout root), so this is inline.
function ModalShell({ title, onClose, children }) {
    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: 16,
        }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#fff',
                    borderRadius: 'var(--radius-lg, 12px)',
                    width: '100%', maxWidth: 560,
                    maxHeight: '90vh', overflowY: 'auto',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border)',
                }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{title}</h3>
                    <button onClick={onClose} style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontSize: 24, lineHeight: 1, color: 'var(--text-muted)',
                    }}>×</button>
                </div>
                <div style={{ padding: 20 }}>{children}</div>
            </div>
        </div>
    )
}

function ViewInvoiceContent({ invoice }) {
    return (
        <div style={{ fontSize: 13.5 }}>
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                paddingBottom: 14, borderBottom: '1px solid var(--border)', marginBottom: 14,
            }}>
                <div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Gym</p>
                    <p style={{ fontWeight: 600 }}>{invoice.companyId?.name || '—'}</p>
                </div>
                <div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Status</p>
                    <span className={`badge ${STATUS_BADGE[invoice.status]}`}>{invoice.status}</span>
                </div>
                <div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Billing period</p>
                    <p>{fmtDate(invoice.billingPeriodStart)} – {fmtDate(invoice.billingPeriodEnd)}</p>
                </div>
                <div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Issued / Due</p>
                    <p>{fmtDate(invoice.issuedAt)} / {fmtDate(invoice.dueDate)}</p>
                </div>
                {invoice.paidAt && (
                    <div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Paid on</p>
                        <p>{fmtDate(invoice.paidAt)}</p>
                    </div>
                )}
                {invoice.paymentMode && (
                    <div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Mode</p>
                        <p>{invoice.paymentMode}</p>
                    </div>
                )}
            </div>

            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Line items</p>
            <div className="table-container" style={{ marginBottom: 14 }}>
            <table style={{ width: '100%', fontSize: 13 }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', padding: '6px 0' }}>Module</th>
                        <th style={{ textAlign: 'left', padding: '6px 0' }}>Period</th>
                        <th style={{ textAlign: 'right', padding: '6px 0' }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.lineItems.map((li, i) => (
                        <tr key={i}>
                            <td style={{ padding: '6px 0' }}>{li.label}</td>
                            <td style={{ padding: '6px 0', color: 'var(--text-muted)' }}>{li.period}</td>
                            <td style={{ padding: '6px 0', textAlign: 'right' }}>{fmt(li.amount)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', fontSize: 13 }}>
                <div style={{ display: 'flex', gap: 24 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                    <span style={{ minWidth: 100, textAlign: 'right' }}>{fmt(invoice.subtotal)}</span>
                </div>
                <div style={{ display: 'flex', gap: 24 }}>
                    <span style={{ color: 'var(--text-muted)' }}>GST (18%)</span>
                    <span style={{ minWidth: 100, textAlign: 'right' }}>{fmt(invoice.gst)}</span>
                </div>
                <div style={{ display: 'flex', gap: 24, fontWeight: 700, fontSize: 15, marginTop: 4, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                    <span>Total</span>
                    <span style={{ minWidth: 100, textAlign: 'right', color: 'var(--primary, #10B981)' }}>{fmt(invoice.total)}</span>
                </div>
            </div>

            {invoice.notes && (
                <div style={{ marginTop: 14, padding: '8px 12px', background: 'var(--bg-secondary, #f9fafb)', borderRadius: 6, fontSize: 12.5 }}>
                    <strong>Notes:</strong> {invoice.notes}
                </div>
            )}
        </div>
    )
}
