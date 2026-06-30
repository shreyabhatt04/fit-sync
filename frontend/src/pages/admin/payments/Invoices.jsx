import { useState, useEffect } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import Modal from '../../../components/shared/Modal'
import Pagination from '../../../components/shared/Pagination'
import { paymentService } from '../../../services/paymentService'
import { companyService } from '../../../services/companyService'
import { formatDate, formatCurrency, getInitials, getStatusClass } from '../../../utils/helpers'
import '../payments/payments.css'

const ITEMS_PER_PAGE = 8

function Invoices() {
  const [payments, setPayments] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [viewModal, setViewModal] = useState({ open: false, payment: null })

  // Customer Copy vs Owner Copy switcher (guide feedback #9a)
  // Defaults to 'customer' on each modal open — see openInvoice below.
  const [copyType, setCopyType] = useState('customer')

  // Disables the Download PDF button while the request is in flight.
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  // Real company info for the invoice header — replaces the previously
  // hardcoded "FitSync Gym / Ahmedabad, Gujarat" text. Loaded once.
  const [company, setCompany] = useState(null)

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const params = { page, limit: ITEMS_PER_PAGE }
      if (filterStatus !== 'all') params.status = filterStatus
      const res = await paymentService.getAll(params)
      setPayments(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInvoices() }, [page, filterStatus])

  // Load gym info once. If this fails the modal still renders with
  // sensible fallbacks — invoice is functional even without it.
  useEffect(() => {
    companyService.getMine()
      .then(res => setCompany(res.data || null))
      .catch(err => console.error('Could not load company info:', err.message))
  }, [])

  const openInvoice = (p) => {
    setCopyType('customer')   // always default to customer copy on open
    setViewModal({ open: true, payment: p })
  }

  const filtered = search
    ? payments.filter(p =>
      `${p.customer?.firstName} ${p.customer?.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      p.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
    )
    : payments

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  // Compose a multi-line gym address from whichever fields are populated.
  const gymAddress = company
    ? [company.address, company.city, company.state].filter(Boolean).join(', ')
    : ''

  return (
    <AdminLayout>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Invoices</h1>
            <p className="page-subtitle">{total} total invoices</p>
          </div>
        </div>

        <div className="filter-bar">
          <div className="search-input-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" className="search-input"
              placeholder="Search invoice or member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 160 }} value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}>
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="due">Unpaid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Invoice No.</th><th>Member</th><th>Amount</th>
                  <th>Date</th><th>Due Date</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7">
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                      <div className="spinner" />
                    </div>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="7">
                    <div className="empty-state">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="8" y1="13" x2="16" y2="13"/>
                        <line x1="8" y1="17" x2="13" y2="17"/>
                      </svg>
                      <h3>No invoices yet</h3>
                      <p>Invoices are generated automatically when payments are recorded.</p>
                    </div>
                  </td></tr>
                ) : filtered.map((p) => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 13 }}>
                      {p.invoiceNumber || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar avatar-sm" style={{ background: '#f2f2f2', color: '#2b2b2b' }}>
                          {getInitials(`${p.customer?.firstName || ''} ${p.customer?.lastName || ''}`)}
                        </div>
                        {p.customer?.firstName} {p.customer?.lastName}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                    <td style={{ fontSize: 13 }}>{formatDate(p.paymentDate)}</td>
                    <td style={{ fontSize: 13 }}>{formatDate(p.dueDate)}</td>
                    <td>
                      <span className={`badge ${getStatusClass(p.status)}`}>{p.status}</span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openInvoice(p)}>
                        View
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

        {/* Invoice View Modal — supports two copies (Customer / Owner) */}
        <Modal
          isOpen={viewModal.open}
          onClose={() => setViewModal({ open: false, payment: null })}
          title="Invoice"
          size="lg"
          footer={
            <>
              <button className="btn btn-secondary"
                onClick={() => setViewModal({ open: false, payment: null })}>Close</button>
              <button
                className="btn btn-secondary"
                onClick={async () => {
                  try {
                    setDownloadingPdf(true)
                    await paymentService.downloadInvoicePdf(
                      viewModal.payment._id,
                      copyType,
                      `invoice-${viewModal.payment.invoiceNumber || viewModal.payment._id}-${copyType}.pdf`,
                    )
                  } catch (err) {
                    alert(err.response?.data?.message || 'Could not download PDF.')
                  } finally {
                    setDownloadingPdf(false)
                  }
                }}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    Generating…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download PDF
                  </>
                )}
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Print {copyType === 'owner' ? 'Owner' : 'Customer'} Copy
              </button>
            </>
          }
        >
          {viewModal.payment && (
            <div className="invoice-modal-content">
              {/* Customer / Owner copy switcher */}
              <div style={{
                display: 'flex',
                gap: 6,
                background: '#f4f4f4',
                padding: 4,
                borderRadius: 8,
                marginBottom: 16,
                width: 'fit-content',
              }}>
                {[
                  { key: 'customer', label: 'Customer Copy' },
                  { key: 'owner',    label: 'Owner Copy'    },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setCopyType(opt.key)}
                    style={{
                      padding: '6px 14px',
                      fontSize: 12.5,
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: copyType === opt.key ? '#ffffff' : 'transparent',
                      color: copyType === opt.key ? 'var(--text-primary)' : 'var(--text-muted)',
                      boxShadow: copyType === opt.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Copy-type banner — looks distinctly different so the printed
                  page is unambiguous about which copy is which. */}
              <div style={{
                marginBottom: 14,
                padding: '6px 12px',
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                textAlign: 'center',
                background: copyType === 'owner' ? '#1f2937' : '#f0fdf4',
                color: copyType === 'owner' ? '#ffffff' : '#047857',
                border: copyType === 'owner' ? 'none' : '1px solid #bbf7d0',
                borderRadius: 4,
              }}>
                {copyType === 'owner' ? 'Owner Copy — Internal Record' : 'Customer Copy'}
              </div>

              <div className="invoice-header">
                <div>
                  <p className="invoice-gym-name">{company?.name || 'Gym'}</p>
                  <p className="invoice-gym-sub">{gymAddress || '—'}</p>
                  {company?.gstNumber && (
                    <p className="invoice-gym-sub" style={{ fontSize: 11.5, marginTop: 2 }}>
                      GSTIN: {company.gstNumber}
                    </p>
                  )}
                  {company?.phone && (
                    <p className="invoice-gym-sub" style={{ fontSize: 11.5 }}>
                      📞 {company.phone}{company.email ? ` · ✉ ${company.email}` : ''}
                    </p>
                  )}
                </div>
                <div className="invoice-meta">
                  <p className="invoice-number">{viewModal.payment.invoiceNumber}</p>
                  <p className="invoice-date">Date: {formatDate(viewModal.payment.paymentDate)}</p>
                  {viewModal.payment.dueDate && (
                    <p className="invoice-date">Due: {formatDate(viewModal.payment.dueDate)}</p>
                  )}
                </div>
              </div>

              <div className="invoice-section">
                <p className="invoice-section-title">Billed To</p>
                <p style={{ fontSize: 15, fontWeight: 600 }}>
                  {viewModal.payment.customer?.firstName} {viewModal.payment.customer?.lastName}
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {viewModal.payment.customer?.email}
                </p>
                {viewModal.payment.customer?.phone && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {viewModal.payment.customer.phone}
                  </p>
                )}
                {viewModal.payment.customer?.address && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {viewModal.payment.customer.address}
                  </p>
                )}
              </div>

              <div className="invoice-section">
                <p className="invoice-section-title">Items</p>
                <table className="invoice-table">
                  <thead>
                    <tr><th>Description</th><th>Mode</th><th>Amount</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Gym Membership</td>
                      <td>{viewModal.payment.mode}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(viewModal.payment.amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="invoice-total-row">
                <span className="invoice-total-label">Total Amount</span>
                <span className="invoice-total-value">{formatCurrency(viewModal.payment.amount)}</span>
              </div>

              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <span className={`badge ${getStatusClass(viewModal.payment.status)}`}
                  style={{ fontSize: 13, padding: '5px 16px' }}>
                  {viewModal.payment.status?.toUpperCase()}
                </span>
              </div>

              {/* Owner-only sections — internal notes + signature line.
                  Hidden on the customer copy entirely. */}
              {copyType === 'owner' && (
                <>
                  <div className="invoice-section" style={{ marginTop: 18 }}>
                    <p className="invoice-section-title">Internal Notes</p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', minHeight: 18 }}>
                      {viewModal.payment.notes || '—'}
                    </p>
                  </div>
                  <div style={{
                    marginTop: 28,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 24,
                  }}>
                    <div>
                      <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                        Received by (signature)
                      </div>
                    </div>
                    <div>
                      <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                        Authorized signatory · {company?.name || 'Gym'}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  )
}

export default Invoices
