import { useState, useEffect } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import Modal from '../../../components/shared/Modal'
import Pagination from '../../../components/shared/Pagination'
import ErrorBanner from '../../../components/shared/ErrorBanner'
import { useToast } from '../../../context/ToastContext'
import { paymentService } from '../../../services/paymentService'
import { customerService } from '../../../services/customerService'
import { subscriptionService } from '../../../services/subscriptionService'
import { formatDate, formatCurrency, getInitials, getStatusClass } from '../../../utils/helpers'
import './payments.css'

const ITEMS_PER_PAGE = 15

const emptyForm = {
  customer: '',
  subscription: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  mode: 'Cash',
  status: 'paid',
  notes: '',
}

function Payments() {
  const toast = useToast()

  const [payments, setPayments] = useState([])
  const [stats, setStats] = useState({ totalCollected: 0, thisMonth: 0, totalDue: 0 })
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterMode, setFilterMode] = useState('all')
  const [page, setPage] = useState(1)

  // Modal
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState(emptyForm)

  // Dropdown data for the modal
  const [customers, setCustomers] = useState([])
  const [customerSubs, setCustomerSubs] = useState([]) // subscriptions for selected customer

  const fetchData = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const params = { page, limit: ITEMS_PER_PAGE }
      if (filterStatus !== 'all') params.status = filterStatus
      if (filterMode !== 'all') params.mode = filterMode

      const [paymentsRes, statsRes] = await Promise.all([
        paymentService.getAll(params),
        paymentService.getStats(),
      ])
      setPayments(paymentsRes.data)
      setTotal(paymentsRes.pagination.total)
      setStats(statsRes.data)
    } catch (err) {
      console.error(err)
      setLoadError(
        err.response?.data?.message ||
        'Could not load payments. Check your connection and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  // Fetch customers once for the modal dropdown
  const fetchCustomers = async () => {
    try {
      const res = await customerService.getAll({ limit: 200 })
      setCustomers(res.data)
    } catch (err) {
      console.error(err)
      toast.error('Could not load member list. The payment form may be incomplete.')
    }
  }

  useEffect(() => { fetchData() }, [page, filterStatus, filterMode])
  useEffect(() => { fetchCustomers() }, [])

  // When customer changes, load their subscriptions and auto-fill amount
  const handleCustomerChange = async (customerId) => {
    setForm(prev => ({ ...prev, customer: customerId, subscription: '', amount: '' }))
    setCustomerSubs([])
    if (!customerId) return
    try {
      const res = await subscriptionService.getAll({ customer: customerId, limit: 20 })
      setCustomerSubs(res.data)
    } catch (err) {
      console.error(err)
      toast.error('Could not load this member\u2019s subscriptions.')
    }
  }

  // When subscription changes, auto-fill the amount from the subscription
  const handleSubscriptionChange = (subId) => {
    const sub = customerSubs.find(s => s._id === subId)
    setForm(prev => ({
      ...prev,
      subscription: subId,
      amount: sub ? sub.amount : prev.amount,
    }))
  }

  const openModal = () => {
    setForm(emptyForm)
    setCustomerSubs([])
    setFormError('')
    setModal(true)
  }

  const handleSave = async () => {
    if (!form.customer) { setFormError('Please select a member'); return }
    if (!form.amount || Number(form.amount) <= 0) { setFormError('Please enter a valid amount'); return }
    if (!form.date) { setFormError('Please select a payment date'); return }

    setSaving(true)
    setFormError('')
    try {
      await paymentService.create({
        customer: form.customer,
        subscription: form.subscription || undefined,
        amount: Number(form.amount),
        paymentDate: form.date,
        mode: form.mode,
        status: form.status,
        notes: form.notes,
      })
      setModal(false)
      setForm(emptyForm)
      toast.success('Payment recorded')
      fetchData()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save payment')
    } finally {
      setSaving(false)
    }
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  // Client-side search filter on already-fetched page
  const filteredPayments = search
    ? payments.filter(p =>
      `${p.customer?.firstName} ${p.customer?.lastName}`
        .toLowerCase().includes(search.toLowerCase()) ||
      p.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
    )
    : payments

  return (
    <AdminLayout>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Payments</h1>
            <p className="page-subtitle">Track all member payments</p>
          </div>
          <button className="btn btn-primary" onClick={openModal}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Payment
          </button>
        </div>

        {/* Summary cards */}
        <div className="payments-summary">
          {[
            { label: 'Total Collected', value: formatCurrency(stats.totalCollected), color: 'green', icon: '💰' },
            { label: 'This Month', value: formatCurrency(stats.thisMonth), color: 'blue', icon: '📅' },
            { label: 'Pending Due', value: formatCurrency(stats.totalDue), color: 'red', icon: '⏳' },
          ].map((s) => (
            <div key={s.label} className={`payment-summary-card payment-summary-${s.color}`}>
              <span className="payment-summary-icon">{s.icon}</span>
              <div>
                <p className="payment-summary-value">{s.value}</p>
                <p className="payment-summary-label">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" className="search-input" placeholder="Search member or invoice..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 150 }} value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}>
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="due">Due</option>
            <option value="overdue">Overdue</option>
          </select>
          <select className="form-select" style={{ width: 150 }} value={filterMode}
            onChange={(e) => { setFilterMode(e.target.value); setPage(1) }}>
            <option value="all">All Modes</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Online">Online</option>
          </select>
        </div>

        {/* Page-level load error (retryable) */}
        {loadError && (
          <ErrorBanner
            message={loadError}
            onRetry={fetchData}
            onDismiss={() => setLoadError('')}
          />
        )}

        {/* Table */}
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr><th>Member</th><th>Amount</th><th>Date</th><th>Mode</th><th>Status</th><th>Invoice</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6">
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                      <div className="spinner" />
                    </div>
                  </td></tr>
                ) : filteredPayments.length === 0 ? (
                  <tr><td colSpan="6">
                    <div className="empty-state">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                        <line x1="6" y1="15" x2="10" y2="15" />
                      </svg>
                      <h3>No payments recorded</h3>
                      <p>Record your first payment to start tracking gym revenue and member dues.</p>
                    </div>
                  </td></tr>
                ) : filteredPayments.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ background: '#f2f2f2', color: '#2b2b2b' }}>
                          {getInitials(`${p.customer?.firstName || ''} ${p.customer?.lastName || ''}`)}
                        </div>
                        {p.customer?.firstName} {p.customer?.lastName}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                    <td style={{ fontSize: 13 }}>{formatDate(p.paymentDate)}</td>
                    <td><span className={`mode-badge mode-${p.mode?.toLowerCase()}`}>{p.mode}</span></td>
                    <td><span className={`badge ${getStatusClass(p.status)}`}>{p.status}</span></td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
                        {p.invoiceNumber}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} totalItems={total} onPageChange={setPage} />
        </div>

        {/* Add Payment Modal */}
        <Modal
          isOpen={modal}
          onClose={() => setModal(false)}
          title="Add Payment"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Save Payment'}
              </button>
            </>
          }
        >
          {formError && (
            <ErrorBanner
              message={formError}
              onDismiss={() => setFormError('')}
            />
          )}

          {/* Customer selector */}
          <div className="form-group">
            <label className="form-label">Member *</label>
            <select
              className="form-select"
              value={form.customer}
              onChange={(e) => handleCustomerChange(e.target.value)}
            >
              <option value="">Select a member</option>
              {customers.map(c => (
                <option key={c._id} value={c._id}>
                  {c.firstName} {c.lastName} — {c.phone}
                </option>
              ))}
            </select>
          </div>

          {/* Subscription selector — only shown if customer has subscriptions */}
          {customerSubs.length > 0 && (
            <div className="form-group">
              <label className="form-label">Subscription (optional)</label>
              <select
                className="form-select"
                value={form.subscription}
                onChange={(e) => handleSubscriptionChange(e.target.value)}
              >
                <option value="">No subscription linked</option>
                {customerSubs.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.membership?.name} — {formatCurrency(s.amount)} (ends {formatDate(s.endDate)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount (₹) *</label>
              <input
                type="number"
                className="form-input"
                placeholder="Amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Date *</label>
              <input
                type="date"
                className="form-input"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Payment Mode</label>
              <select className="form-select" value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                <option>Cash</option><option>Card</option><option>Online</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="paid">Paid</option>
                <option value="due">Due</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" rows={2} placeholder="Optional notes"
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </Modal>
      </div>
    </AdminLayout>
  )
}

export default Payments