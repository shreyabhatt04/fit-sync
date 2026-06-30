import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import CustomerLayout from '../../components/customer/CustomerLayout'
import Pagination from '../../components/shared/Pagination'
import { paymentService } from '../../services/paymentService'
import { companyService } from '../../services/companyService'
import { formatDate, formatCurrency, getStatusClass } from '../../utils/helpers'
import './customer.css'

const ITEMS_PER_PAGE = 15

function MyPayments() {
    const [payments, setPayments] = useState([])
    const [stats, setStats] = useState({ totalPaid: 0, paymentsMade: 0, pending: 0 })
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(true)

    // Gym's payment info (UPI + bank) and the rendered QR data URL.
    // Both null/empty until the gym admin has configured a UPI ID.
    const [paymentInfo, setPaymentInfo] = useState(null)
    const [qrDataUrl, setQrDataUrl] = useState('')

    // Fetch gym payment info + generate QR once on mount.
    // The QR encodes a standard UPI deep-link without a fixed amount, so the
    // customer can scan and enter whatever they're paying in their UPI app.
    useEffect(() => {
        const loadPaymentInfo = async () => {
            try {
                const res = await companyService.getPaymentInfo()
                const info = res.data
                setPaymentInfo(info)

                const upiId = info?.bankDetails?.upiId
                if (upiId) {
                    const payeeName = encodeURIComponent(info.name || 'Gym')
                    const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${payeeName}&cu=INR`
                    const dataUrl = await QRCode.toDataURL(upiUri, {
                        width: 220,
                        margin: 1,
                        color: { dark: '#0f172a', light: '#ffffff' },
                    })
                    setQrDataUrl(dataUrl)
                }
            } catch (err) {
                // Non-fatal — page works without QR
                console.error('Could not load payment info:', err)
            }
        }
        loadPaymentInfo()
    }, [])

    // Fetch the current page (newest first; backend already sorts by paymentDate desc)
    useEffect(() => {
        const fetchPayments = async () => {
            setLoading(true)
            try {
                const res = await paymentService.getAll({ page, limit: ITEMS_PER_PAGE })
                setPayments(res.data)
                setTotal(res.pagination?.total || 0)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchPayments()
    }, [page])

    // Fetch lifetime stats once (independent of pagination so the summary cards
    // always reflect the customer's full history, not just the visible page).
    useEffect(() => {
        const fetchAll = async () => {
            try {
                // Pull a generous slice for stats; customer histories are typically small.
                const res = await paymentService.getAll({ limit: 500 })
                const all = res.data || []
                setStats({
                    totalPaid: all.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0),
                    paymentsMade: all.filter(p => p.status === 'paid').length,
                    pending: all.filter(p => p.status === 'due').length,
                })
            } catch (err) {
                console.error(err)
            }
        }
        fetchAll()
    }, [])

    const handleDownloadInvoice = async (p) => {
        try {
            // Server-generated PDF — same template the admin sees, with the
            // gym's real branding. Customers always get the customer copy
            // (the backend ignores ?copy=owner from a customer role).
            await paymentService.downloadInvoicePdf(
                p._id,
                'customer',
                `invoice-${p.invoiceNumber || p._id}.pdf`,
            )
        } catch (err) {
            console.error('Invoice download failed:', err)
            alert(err.response?.data?.message || 'Could not download invoice. Please try again.')
        }
    }

    const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

    if (loading && payments.length === 0) {
        return (
            <CustomerLayout>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                    <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
                </div>
            </CustomerLayout>
        )
    }

    return (
        <CustomerLayout>
            <div className="customer-page">
                <div style={{ marginBottom: 4 }}>
                    <h1 className="page-title">My Payments</h1>
                    <p className="page-subtitle">Payment history and invoices</p>
                </div>

                {/* Summary — uses customer-stats-grid responsive CSS class.
                    Previously forced repeat(3, 1fr) inline which broke
                    on phones (3 cols × ~110px crushed values, then
                    horizontal-scrolled). Now the CSS class collapses
                    to 2-col then 1-col at narrow widths. */}
                <div className="customer-stats-grid">
                    {[
                        { label: 'Total Paid', value: formatCurrency(stats.totalPaid), icon: '💰', color: '#f0fdf4', iconBg: '#16a34a' },
                        { label: 'Payments Made', value: stats.paymentsMade, icon: '🧾', color: '#f2f2f2', iconBg: '#2b2b2b' },
                        { label: 'Pending', value: stats.pending, icon: '⏳', color: '#fef3e8', iconBg: '#c05b10' },
                    ].map((s) => (
                        <div key={s.label} className="customer-stat-card" style={{ background: s.color }}>
                            <div className="customer-stat-icon" style={{ background: s.iconBg }}>
                                <span>{s.icon}</span>
                            </div>
                            <div>
                                <p className="customer-stat-label">{s.label}</p>
                                <p className="customer-stat-value">{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pay via UPI — only shown if the gym has configured a UPI ID */}
                {qrDataUrl && (
                    <div className="card" style={{
                        marginBottom: 20,
                        display: 'flex', alignItems: 'center', gap: 24,
                        flexWrap: 'wrap',
                    }}>
                        <div style={{
                            background: '#ffffff',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            padding: 12,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <img
                                src={qrDataUrl}
                                alt="UPI QR code"
                                width={180}
                                height={180}
                                style={{ display: 'block' }}
                            />
                        </div>
                        <div style={{ flex: 1, minWidth: 240 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                                Pay via UPI
                            </h3>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                                Scan this QR with any UPI app (PhonePe, Google Pay, Paytm, BHIM) to pay your dues.
                            </p>
                            <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                                <div>
                                    <span style={{ color: 'var(--text-muted)' }}>Pay to: </span>
                                    <strong>{paymentInfo?.name}</strong>
                                </div>
                                <div>
                                    <span style={{ color: 'var(--text-muted)' }}>UPI ID: </span>
                                    <code style={{
                                        background: 'var(--bg-secondary)',
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        fontSize: 12.5,
                                    }}>
                                        {paymentInfo?.bankDetails?.upiId}
                                    </code>
                                </div>
                                {paymentInfo?.bankDetails?.bankName && (
                                    <div style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 6 }}>
                                        Bank transfer also available — see invoice for full bank details.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="card" style={{ padding: 0 }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600 }}>Payment History</h3>
                    </div>
                    <div className="table-container" style={{ border: 'none' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Invoice</th><th>Amount</th><th>Date</th>
                                    <th>Mode</th><th>Status</th><th>Download</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="6">
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                                            <div className="spinner" />
                                        </div>
                                    </td></tr>
                                ) : payments.length === 0 ? (
                                    <tr><td colSpan="6">
                                        <div className="empty-state">
                                            <p>No payment records found</p>
                                        </div>
                                    </td></tr>
                                ) : payments.map((p) => (
                                    <tr key={p._id}>
                                        <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 13 }}>
                                            {p.invoiceNumber || '—'}
                                        </td>
                                        <td style={{ fontWeight: 700 }}>{formatCurrency(p.amount)}</td>
                                        <td style={{ fontSize: 13 }}>{formatDate(p.paymentDate)}</td>
                                        <td>
                                            <span className={`mode-badge mode-${p.mode?.toLowerCase()}`}>
                                                {p.mode}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusClass(p.status)}`}>{p.status}</span>
                                        </td>
                                        <td>
                                            <button className="btn btn-secondary btn-sm" onClick={() => handleDownloadInvoice(p)}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                    <polyline points="7 10 12 15 17 10" />
                                                    <line x1="12" y1="15" x2="12" y2="3" />
                                                </svg>
                                                Invoice
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination page={page} totalPages={totalPages} totalItems={total} onPageChange={setPage} />
                </div>
            </div>
        </CustomerLayout>
    )
}

export default MyPayments
