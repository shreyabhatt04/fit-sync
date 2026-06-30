import { useState, useEffect } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import ModuleDisabled from '../../../components/shared/ModuleDisabled'
import { useModuleEnabled } from '../../../hooks/useModuleEnabled'
import { reportService } from '../../../services/reportService'
import { customerService } from '../../../services/customerService'
import { subscriptionService } from '../../../services/subscriptionService'
import { paymentService } from '../../../services/paymentService'
import { expenseService } from '../../../services/expenseService'
import { enquiryService } from '../../../services/enquiryService'
import { attendanceService } from '../../../services/attendanceService'
import { formatCurrency, formatDate } from '../../../utils/helpers'
import './reports.css'

const reportTypes = [
    { key: 'financial', label: 'Financial Report', icon: '💰' },
    { key: 'clients', label: 'Clients Report', icon: '👥' },
    { key: 'subscription', label: 'Subscription Report', icon: '📦' },
    { key: 'attendance', label: 'Attendance Report', icon: '✅' },
    { key: 'enquiry', label: 'Enquiry Report', icon: '❓' },
    { key: 'balance', label: 'Balance Report', icon: '⚖️' },
    { key: 'gst', label: 'GST Report (R1 / R2)', icon: '🧾' },
]

function Reports() {
    // Guard the entire page behind the reports module. We do this first so
    // none of the page's effects fire (no 403 requests piling up in the
    // network tab). Pattern to copy onto other gated pages: import the hook
    // + ModuleDisabled, then early-return inside an AdminLayout wrapper.
    const { isEnabled, isLoading: moduleLoading } = useModuleEnabled('reports')

    const [selected, setSelected] = useState('financial')
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [dateFrom, setDateFrom] = useState('2026-01-01')
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])

    // GST-specific state — only used when selected === 'gst'.
    // previewRate=18 means: any sale/expense with stored gstRate=0 will be
    // reported as if it were 18% GST-inclusive. Set to 0 to skip.
    const [previewRate, setPreviewRate] = useState(18)
    const [gstSubTab, setGstSubTab] = useState('gstr1')   // 'gstr1' | 'gstr2'
    const [gstr1Data, setGstr1Data] = useState(null)
    const [gstr2Data, setGstr2Data] = useState(null)
    // Tracks whether GST data has been fetched. Used in lieu of stuffing
    // a sentinel into `data`, which used to bleed into the next non-GST
    // tab as `{ready: true}` and trip the array-shape guards. (Batch 21.1.)
    const [gstReady, setGstReady] = useState(false)

    const fetchReport = async (type) => {
        setLoading(true)
        // Clear BOTH state machines so neither the previous tab's array
        // data nor the GST sentinel can bleed into the new tab's render.
        setData(null)
        setGstReady(false)
        try {
            let res
            switch (type) {
                case 'financial':
                    res = await reportService.getFinancialReport()
                    setData(res.data)
                    break
                case 'clients':
                    res = await customerService.getAll({ limit: 100 })
                    setData(res.data)
                    break
                case 'subscription':
                    res = await subscriptionService.getAll({ limit: 100 })
                    setData(res.data)
                    break
                case 'attendance':
                    res = await attendanceService.getSummary()
                    setData(res.data)
                    break
                case 'enquiry':
                    res = await enquiryService.getAll({ limit: 100 })
                    setData(res.data)
                    break
                case 'balance':
                    res = await reportService.getFinancialReport()
                    setData(res.data)
                    break
                case 'gst': {
                    // Fetch both R1 and R2 in parallel using the current date
                    // range and preview rate. Stored separately so the user
                    // can swap between sub-tabs without refetching.
                    const params = { from: dateFrom, to: dateTo, previewRate }
                    const [r1, r2] = await Promise.all([
                        reportService.getGstr1(params),
                        reportService.getGstr2(params),
                    ])
                    setGstr1Data(r1.data)
                    setGstr2Data(r2.data)
                    setGstReady(true)
                    // Note: do NOT touch `data` here. We keep `data` array-only
                    // so the array-shape guards in renderReport stay simple.
                    break
                }
                default:
                    break
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchReport(selected) }, [selected])
    // Refetch GST when its parameters change. The other reports don't watch
    // dateFrom/dateTo today, so this guard limits the refetch to the GST tab.
    useEffect(() => {
        if (selected === 'gst') fetchReport('gst')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateFrom, dateTo, previewRate])

    const getAttPct = (p) => Math.round((p.present / (p.present + p.absent || 1)) * 100)
    const getAttColor = (pct) => pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'
    const getStatusClass = (s) => {
        const m = { converted: 'badge-success', pending: 'badge-warning', lost: 'badge-danger', new: 'badge-info', 'follow-up': 'badge-warning', active: 'badge-success', expired: 'badge-danger' }
        return m[s] || 'badge-gray'
    }

    const renderReport = () => {
        if (loading) return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
            </div>
        )

        // GST tab uses its own gstr1Data/gstr2Data state. Other tabs use
        // `data` as an array. Each branch has its own readiness check —
        // they don't share state any more (Batch 21.1).
        if (selected === 'gst') {
            if (!gstReady) return null
        } else {
            if (!data) return null
            if (!Array.isArray(data)) {
                // Defensive guard: a controller returned a non-array
                // (an error object that wasn't caught, or a legacy
                // wrapper response). Render an empty state so the page
                // doesn't crash, log to console for the developer.
                console.error(
                    `[Reports] Expected array for tab "${selected}", got:`,
                    data
                )
                return (
                    <div className="empty-state">
                        <p>Could not load this report. Please try again or check the server logs.</p>
                    </div>
                )
            }
        }

        switch (selected) {
            case 'financial':
            case 'balance':
                return (
                    <div>
                        <div className="report-summary-row">
                            <div className="report-summary-chip">
                                <p className="report-chip-value" style={{ color: 'var(--success)' }}>
                                    {formatCurrency(data.reduce((s, r) => s + r.income, 0))}
                                </p>
                                <p className="report-chip-label">Total Income</p>
                            </div>
                            <div className="report-summary-chip">
                                <p className="report-chip-value" style={{ color: 'var(--danger)' }}>
                                    {formatCurrency(data.reduce((s, r) => s + r.expense, 0))}
                                </p>
                                <p className="report-chip-label">Total Expenses</p>
                            </div>
                            <div className="report-summary-chip">
                                <p className="report-chip-value" style={{ color: 'var(--primary)' }}>
                                    {formatCurrency(data.reduce((s, r) => s + r.net, 0))}
                                </p>
                                <p className="report-chip-label">Net Profit</p>
                            </div>
                        </div>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net</th></tr>
                                </thead>
                                <tbody>
                                    {data.map((r, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 500 }}>{r.month}</td>
                                            <td style={{ color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(r.income)}</td>
                                            <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{formatCurrency(r.expense)}</td>
                                            <td style={{ color: 'var(--primary)', fontWeight: 700 }}>{formatCurrency(r.net)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )

            case 'clients':
                return (
                    <div>
                        <div className="report-summary-row">
                            <div className="report-summary-chip">
                                <p className="report-chip-value">{data.length}</p>
                                <p className="report-chip-label">Total Clients</p>
                            </div>
                            <div className="report-summary-chip">
                                <p className="report-chip-value" style={{ color: 'var(--success)' }}>
                                    {data.filter(c => c.status === 'active').length}
                                </p>
                                <p className="report-chip-label">Active</p>
                            </div>
                            <div className="report-summary-chip">
                                <p className="report-chip-value" style={{ color: 'var(--danger)' }}>
                                    {data.filter(c => c.status === 'expired').length}
                                </p>
                                <p className="report-chip-label">Expired</p>
                            </div>
                        </div>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr><th>Name</th><th>Email</th><th>Phone</th><th>Join Date</th><th>Status</th></tr>
                                </thead>
                                <tbody>
                                    {data.map((c) => (
                                        <tr key={c._id}>
                                            <td style={{ fontWeight: 500 }}>{c.firstName} {c.lastName}</td>
                                            <td style={{ fontSize: 13 }}>{c.email}</td>
                                            <td style={{ fontSize: 13 }}>{c.phone}</td>
                                            <td style={{ fontSize: 13 }}>{formatDate(c.joinDate)}</td>
                                            <td><span className={`badge ${getStatusClass(c.status)}`}>{c.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )

            case 'subscription':
                const planGroups = data.reduce((acc, s) => {
                    const name = s.membership?.name || 'Unknown'
                    if (!acc[name]) acc[name] = { name, total: 0, active: 0, expired: 0, revenue: 0 }
                    acc[name].total++
                    if (s.status === 'active') acc[name].active++
                    if (s.status === 'expired') acc[name].expired++
                    acc[name].revenue += s.amount
                    return acc
                }, {})
                return (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr><th>Plan</th><th>Total</th><th>Active</th><th>Expired</th><th>Revenue</th></tr>
                            </thead>
                            <tbody>
                                {Object.values(planGroups).map((g) => (
                                    <tr key={g.name}>
                                        <td style={{ fontWeight: 500 }}>{g.name}</td>
                                        <td>{g.total}</td>
                                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>{g.active}</td>
                                        <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{g.expired}</td>
                                        <td style={{ fontWeight: 600 }}>{formatCurrency(g.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )

            case 'attendance':
                return (
                    <div>
                        {data.length === 0 ? (
                            <div className="empty-state"><p>No attendance data available</p></div>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr><th>Member ID</th><th>Present</th><th>Absent</th><th>Rate</th></tr>
                                    </thead>
                                    <tbody>
                                        {data.map((a, i) => {
                                            const pct = getAttPct(a)
                                            return (
                                                <tr key={i}>
                                                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                                        {String(a._id).slice(-6)}
                                                    </td>
                                                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{a.present}</td>
                                                    <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{a.absent}</td>
                                                    <td style={{ minWidth: 180 }}>
                                                        <div className="progress-wrapper">
                                                            <div className="progress-bar">
                                                                <div className="progress-fill"
                                                                    style={{ width: `${pct}%`, background: getAttColor(pct) }} />
                                                            </div>
                                                            <span className="progress-label">{pct}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )

            case 'enquiry':
                return (
                    <div>
                        <div className="report-summary-row">
                            {['new', 'follow-up', 'converted', 'lost'].map(s => (
                                <div key={s} className="report-summary-chip">
                                    <p className="report-chip-value">
                                        {data.filter(e => e.status === s).length}
                                    </p>
                                    <p className="report-chip-label" style={{ textTransform: 'capitalize' }}>{s}</p>
                                </div>
                            ))}
                        </div>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr><th>Name</th><th>Phone</th><th>Source</th><th>Interested In</th><th>Status</th></tr>
                                </thead>
                                <tbody>
                                    {data.map((e) => (
                                        <tr key={e._id}>
                                            <td style={{ fontWeight: 500 }}>{e.name}</td>
                                            <td style={{ fontSize: 13 }}>{e.phone}</td>
                                            <td><span className="badge badge-info">{e.source}</span></td>
                                            <td><span className="badge badge-gray">{e.interestedIn}</span></td>
                                            <td><span className={`badge ${getStatusClass(e.status)}`}>{e.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )

            default: return null
        }
    }

    // ─── GST-specific renderer ──────────────────────────────────
    // Kept as a separate function rather than another case in the switch
    // because the layout is substantially different (sub-tabs, range inputs,
    // preview toggle) and stuffing it into renderReport() would make that
    // function messy.
    const renderGstReport = () => {
        // Show spinner while fetching, OR before the first fetch completes.
        // (Batch 21.1 made `data` stay null for the GST tab — we use the
        // dedicated `gstReady` flag instead. Previously this guard checked
        // !data which was always true, so the spinner spun forever.)
        if (loading || !gstReady) return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
            </div>
        )
        const active = gstSubTab === 'gstr1' ? gstr1Data : gstr2Data
        if (!active) return null

        const downloadCsv = async () => {
            const params = { from: dateFrom, to: dateTo, previewRate }
            try {
                if (gstSubTab === 'gstr1') await reportService.downloadGstr1Csv(params)
                else                       await reportService.downloadGstr2Csv(params)
            } catch (err) {
                alert(err.response?.data?.message || 'CSV download failed.')
            }
        }

        const hasPreviewRows = active.lineItems.some(r => r.isPreview)

        return (
            <div>
                {/* Range + preview controls */}
                <div style={{
                    display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end',
                    padding: '12px 0 18px',
                    borderBottom: '1px solid var(--border)',
                    marginBottom: 18,
                }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">From</label>
                        <input type="date" className="form-input"
                            value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                            style={{ width: 160 }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">To</label>
                        <input type="date" className="form-input"
                            value={dateTo} onChange={e => setDateTo(e.target.value)}
                            style={{ width: 160 }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Preview rate</label>
                        <select className="form-select" style={{ width: 140 }}
                            value={previewRate} onChange={e => setPreviewRate(Number(e.target.value))}>
                            <option value={0}>None</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18% (gym default)</option>
                            <option value={28}>28%</option>
                        </select>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={downloadCsv}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download CSV
                    </button>
                </div>

                {/* Sub-tabs: GSTR-1 / GSTR-2 */}
                <div style={{
                    display: 'flex', gap: 6,
                    background: '#f4f4f4', padding: 4, borderRadius: 8,
                    width: 'fit-content', marginBottom: 18,
                }}>
                    {[
                        { k: 'gstr1', label: 'GSTR-1 (Sales)' },
                        { k: 'gstr2', label: 'GSTR-2 (Purchases)' },
                    ].map(t => (
                        <button key={t.k}
                            onClick={() => setGstSubTab(t.k)}
                            style={{
                                padding: '6px 14px',
                                fontSize: 12.5, fontWeight: 600,
                                border: 'none', borderRadius: 6, cursor: 'pointer',
                                background: gstSubTab === t.k ? '#ffffff' : 'transparent',
                                color: gstSubTab === t.k ? 'var(--text-primary)' : 'var(--text-muted)',
                                boxShadow: gstSubTab === t.k ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {hasPreviewRows && (
                    <div style={{
                        marginBottom: 14, padding: '8px 12px',
                        fontSize: 12.5, color: '#92400e',
                        background: '#fffbeb', border: '1px solid #fde68a',
                        borderRadius: 6,
                    }}>
                        ⚠️ Some rows are <strong>preview-only</strong> — they didn't have GST stored, so
                        a {previewRate}% rate has been applied for this view. To finalise these for
                        filing, edit the underlying records and set their actual GST values.
                    </div>
                )}

                {/* Summary by rate */}
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Summary by Rate
                </h4>
                <div className="table-container" style={{ marginBottom: 22 }}>
                    <table style={{ width: '100%', fontSize: 13 }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Rate</th>
                                <th style={{ textAlign: 'right' }}>Records</th>
                                <th style={{ textAlign: 'right' }}>Taxable</th>
                                <th style={{ textAlign: 'right' }}>CGST</th>
                                <th style={{ textAlign: 'right' }}>SGST</th>
                                <th style={{ textAlign: 'right' }}>IGST</th>
                                <th style={{ textAlign: 'right' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {active.byRate.length === 0 ? (
                                <tr><td colSpan="7" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No records in this date range.
                                </td></tr>
                            ) : active.byRate.map(b => (
                                <tr key={b.rate}>
                                    <td style={{ fontWeight: 600 }}>
                                        {b.rate === 0 ? 'Non-GST / 0%' : `${b.rate}%`}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>{b.count}</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(b.taxable)}</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(b.cgst)}</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(b.sgst)}</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(b.igst)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(b.total)}</td>
                                </tr>
                            ))}
                            <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700, background: 'var(--bg-secondary)' }}>
                                <td>Grand Total</td>
                                <td style={{ textAlign: 'right' }}>{active.lineItems.length}</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(active.grand.taxable)}</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(active.grand.cgst)}</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(active.grand.sgst)}</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(active.grand.igst)}</td>
                                <td style={{ textAlign: 'right', color: 'var(--primary, #10B981)' }}>{formatCurrency(active.grand.total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Line-item detail */}
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Line Items ({active.lineItems.length})
                </h4>
                <div className="table-container">
                    <table style={{ width: '100%', fontSize: 12.5 }}>
                        <thead>
                            <tr>
                                {gstSubTab === 'gstr1' ? (
                                    <>
                                        <th style={{ textAlign: 'left' }}>Invoice</th>
                                        <th style={{ textAlign: 'left' }}>Date</th>
                                        <th style={{ textAlign: 'left' }}>Customer</th>
                                    </>
                                ) : (
                                    <>
                                        <th style={{ textAlign: 'left' }}>Date</th>
                                        <th style={{ textAlign: 'left' }}>Category</th>
                                        <th style={{ textAlign: 'left' }}>Description</th>
                                    </>
                                )}
                                <th style={{ textAlign: 'right' }}>Rate</th>
                                <th style={{ textAlign: 'right' }}>Taxable</th>
                                <th style={{ textAlign: 'right' }}>CGST</th>
                                <th style={{ textAlign: 'right' }}>SGST</th>
                                <th style={{ textAlign: 'right' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {active.lineItems.length === 0 ? (
                                <tr><td colSpan={gstSubTab === 'gstr1' ? 8 : 8} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No line items.
                                </td></tr>
                            ) : active.lineItems.map((r, i) => (
                                <tr key={r.record?._id || i} style={r.isPreview ? { background: '#fffbeb' } : undefined}>
                                    {gstSubTab === 'gstr1' ? (
                                        <>
                                            <td style={{ fontWeight: 600, color: 'var(--primary, #10B981)' }}>
                                                {r.record.invoiceNumber || '—'}
                                            </td>
                                            <td>{formatDate(r.record.paymentDate)}</td>
                                            <td>{r.record.customer?.firstName} {r.record.customer?.lastName}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td>{formatDate(r.record.date)}</td>
                                            <td><span className="badge badge-gray">{r.record.category}</span></td>
                                            <td>{r.record.description}</td>
                                        </>
                                    )}
                                    <td style={{ textAlign: 'right' }}>{r.rate}%</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(r.taxable)}</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(r.cgst)}</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(r.sgst)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(r.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    const current = reportTypes.find(r => r.key === selected)

    // Module gating early-return — placed AFTER all hook declarations so the
    // rules-of-hooks aren't violated. The data fetches above won't display
    // (we never render anything when !isEnabled) but they will fire — that's
    // a minor cost we accept to keep the hook order stable. The backend's
    // moduleGuard rejects them cleanly with 403 + MODULE_NOT_ENABLED.
    if (moduleLoading) {
        return (
            <AdminLayout>
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
                </div>
            </AdminLayout>
        )
    }
    if (!isEnabled) {
        return (
            <AdminLayout>
                <ModuleDisabled module="Reports" />
            </AdminLayout>
        )
    }

    return (
        <AdminLayout>
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Reports</h1>
                        <p className="page-subtitle">Business insights and analytics</p>
                    </div>
                </div>

                <div className="reports-layout">
                    {/* Sidebar */}
                    <div className="reports-sidebar">
                        {reportTypes.map((r) => (
                            <button key={r.key}
                                className={`report-type-btn ${selected === r.key ? 'active' : ''}`}
                                onClick={() => setSelected(r.key)}>
                                <span className="report-type-icon">{r.icon}</span>
                                <span className="report-type-label">{r.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="reports-content">
                        <div className="card">
                            <div className="report-content-header">
                                <h3 className="card-title">{current?.icon} {current?.label}</h3>
                                <div className="report-actions">
                                    <button className="btn btn-primary btn-sm"
                                        onClick={() => fetchReport(selected)}>
                                        Refresh
                                    </button>
                                    <button className="btn btn-secondary btn-sm">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                        Export CSV
                                    </button>
                                </div>
                            </div>
                            {selected === 'gst' ? renderGstReport() : renderReport()}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}

export default Reports