const Customer     = require('../models/Customer')
const Payment      = require('../models/Payment')
const Expense      = require('../models/Expense')
const Subscription = require('../models/Subscription')

// GET /api/reports/dashboard
exports.getDashboardStats = async (req, res, next) => {
    try {
        const companyId = req.companyId
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        const [totalMembers, activeSubscriptions, monthlyRevenue, duePayments, totalExpenses] = await Promise.all([
            Customer.countDocuments({ companyId }),
            Subscription.countDocuments({ companyId, status: 'active' }),
            Payment.aggregate([
                { $match: { companyId, status: 'paid', paymentDate: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Payment.countDocuments({ companyId, status: { $in: ['due', 'overdue'] } }),
            Expense.aggregate([
                { $match: { companyId, date: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
        ])

        res.json({
            success: true,
            data: {
                totalMembers,
                activeSubscriptions,
                monthlyRevenue: monthlyRevenue[0]?.total || 0,
                duePayments,
                // The expense aggregate above is filtered to startOfMonth,
                // so this is "this month's expenses", not all-time. Old
                // dashboards labelled this "Total Expenses" which was
                // wrong/misleading — the accurate name is monthlyExpenses.
                // Both are returned for backward compat; frontends should
                // prefer monthlyExpenses.
                monthlyExpenses: totalExpenses[0]?.total || 0,
                totalExpenses:   totalExpenses[0]?.total || 0,   // legacy alias
            },
        })
    } catch (err) { next(err) }
}

// GET /api/reports/financial — 6-month income/expense chart
exports.getFinancialReport = async (req, res, next) => {
    try {
        const companyId = req.companyId
        const months = []

        for (let i = 5; i >= 0; i--) {
            const d = new Date()
            d.setMonth(d.getMonth() - i)
            const start = new Date(d.getFullYear(), d.getMonth(), 1)
            const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1)

            const [income, expense] = await Promise.all([
                Payment.aggregate([
                    { $match: { companyId, status: 'paid', paymentDate: { $gte: start, $lt: end } } },
                    { $group: { _id: null, total: { $sum: '$amount' } } },
                ]),
                Expense.aggregate([
                    { $match: { companyId, date: { $gte: start, $lt: end } } },
                    { $group: { _id: null, total: { $sum: '$amount' } } },
                ]),
            ])

            const incomeTotal  = income[0]?.total  || 0
            const expenseTotal = expense[0]?.total || 0
            months.push({
                month:   d.toLocaleString('en-IN', { month: 'short', year: 'numeric' }),
                income:  incomeTotal,
                expense: expenseTotal,
                net:     incomeTotal - expenseTotal,
            })
        }

        res.json({ success: true, data: months })
    } catch (err) { next(err) }
}

// ─────────────────────────────────────────────────────────────────
// GST Reports — guide feedback #9c
// ─────────────────────────────────────────────────────────────────
//
// GSTR-1 = outward supplies (sales) — what we billed customers
// GSTR-2 = inward supplies (purchases / expenses) — what we paid suppliers
//
// Both reports accept a date range (?from=YYYY-MM-DD&to=YYYY-MM-DD) and
// return rows grouped by GST rate plus a flat list of underlying records.
// Frontend uses the grouped totals for the headline summary and the flat
// list for line-item detail / CSV export.
//
// "Preview rate" semantics: for records where gstRate=0 (most legacy data
// before Batch 15) the report just shows them in a "Non-GST" bucket. The
// frontend has a toggle that asks the server to apply a preview rate
// (typically 18%) to those records — handled below via the previewRate
// query param. This lets users see what the report would look like if
// they backfilled GST onto historical sales.

// Helper — parse a date query param into start-of-day or end-of-day Date.
const parseDateParam = (s, endOfDay = false) => {
    if (!s) return null
    const d = new Date(s)
    if (isNaN(d)) return null
    if (endOfDay) d.setHours(23, 59, 59, 999)
    else          d.setHours(0, 0, 0, 0)
    return d
}

// Helper — derive taxable + cgst+sgst+igst for one row.
// Records where the GST fields are populated use them as-is.
// Records with gstRate=0 (legacy/non-GST) optionally apply a preview rate
// against the full amount, treating it as gross-inclusive.
//
// Preview math: amount = taxable * (1 + rate/100), so taxable = amount / (1 + rate/100).
// Tax is split as half CGST + half SGST (intra-state convention; we don't
// store state-of-supply in this codebase, so this default is the safest).
const computeRowGst = (rec, previewRate) => {
    if (rec.gstRate > 0 && rec.taxableAmount > 0) {
        return {
            rate:    rec.gstRate,
            taxable: rec.taxableAmount,
            cgst:    rec.cgst || 0,
            sgst:    rec.sgst || 0,
            igst:    rec.igst || 0,
            total:   rec.amount,
            isPreview: false,
        }
    }
    if (previewRate && previewRate > 0) {
        const taxable = +(rec.amount / (1 + previewRate / 100)).toFixed(2)
        const taxAmt  = +(rec.amount - taxable).toFixed(2)
        const half    = +(taxAmt / 2).toFixed(2)
        return {
            rate:    previewRate,
            taxable,
            cgst:    half,
            sgst:    +(taxAmt - half).toFixed(2),  // absorb rounding
            igst:    0,
            total:   rec.amount,
            isPreview: true,
        }
    }
    // No preview — record contributes to "Non-GST" bucket
    return {
        rate:    0,
        taxable: rec.amount,
        cgst:    0,
        sgst:    0,
        igst:    0,
        total:   rec.amount,
        isPreview: false,
    }
}

// Group rows by their effective rate. Returns the breakdown summary the
// summary card on the report page renders.
const summarizeByRate = (rows) => {
    const map = new Map()
    for (const r of rows) {
        const bucket = map.get(r.rate) || { rate: r.rate, count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
        bucket.count   += 1
        bucket.taxable += r.taxable
        bucket.cgst    += r.cgst
        bucket.sgst    += r.sgst
        bucket.igst    += r.igst
        bucket.total   += r.total
        map.set(r.rate, bucket)
    }
    // Sort: 0 (non-GST) first, then ascending rates
    return Array.from(map.values()).sort((a, b) => a.rate - b.rate)
}

// Build the row + summary for one of the two reports. Shared between GSTR-1
// and GSTR-2 because the calculation logic is identical — only the source
// collection and date field differ.
const buildGstReport = async ({ companyId, dateField, Model, baseFilter, from, to, previewRate, populateOpts }) => {
    const filter = { companyId, ...baseFilter }
    if (from || to) {
        filter[dateField] = {}
        if (from) filter[dateField].$gte = from
        if (to)   filter[dateField].$lte = to
    }
    let q = Model.find(filter).sort({ [dateField]: 1 })
    if (populateOpts) q = q.populate(populateOpts.path, populateOpts.select)
    const records = await q.lean()

    const lineItems = records.map(rec => {
        const g = computeRowGst(rec, previewRate)
        return { record: rec, ...g }
    })
    const byRate = summarizeByRate(lineItems)
    const grand = lineItems.reduce((acc, r) => ({
        taxable: acc.taxable + r.taxable,
        cgst:    acc.cgst    + r.cgst,
        sgst:    acc.sgst    + r.sgst,
        igst:    acc.igst    + r.igst,
        total:   acc.total   + r.total,
    }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 })

    return {
        from: from ? from.toISOString() : null,
        to:   to   ? to.toISOString()   : null,
        previewRate: previewRate || 0,
        byRate,
        grand,
        lineItems,
    }
}

// GET /api/reports/gstr1?from=...&to=...&previewRate=18
// Outward supplies (sales / paid customer payments).
exports.getGstr1Report = async (req, res, next) => {
    try {
        const from = parseDateParam(req.query.from, false)
        const to   = parseDateParam(req.query.to, true)
        const previewRate = Number(req.query.previewRate) || 0

        const data = await buildGstReport({
            companyId: req.companyId,
            dateField: 'paymentDate',
            Model: Payment,
            baseFilter: { status: 'paid' },
            from, to, previewRate,
            populateOpts: { path: 'customer', select: 'firstName lastName email' },
        })
        res.json({ success: true, data })
    } catch (err) { next(err) }
}

// GET /api/reports/gstr2?from=...&to=...&previewRate=18
// Inward supplies (expenses / purchases).
exports.getGstr2Report = async (req, res, next) => {
    try {
        const from = parseDateParam(req.query.from, false)
        const to   = parseDateParam(req.query.to, true)
        const previewRate = Number(req.query.previewRate) || 0

        const data = await buildGstReport({
            companyId: req.companyId,
            dateField: 'date',
            Model: Expense,
            baseFilter: {},
            from, to, previewRate,
            populateOpts: null,
        })
        res.json({ success: true, data })
    } catch (err) { next(err) }
}

// ─── CSV exports ─────────────────────────────────────────────────
//
// We hand-roll CSV here rather than pulling in a dep. Two reasons:
// (1) Indian GST returns are accepted as CSV by the official GSTN portal
//     uploader, so this is a real workflow not a workaround.
// (2) Avoids adding xlsx (which is large and old on npm).
//
// The CSV format below mirrors the columns SheetJS / Excel will display
// cleanly when opened. UTF-8 BOM prefixed so Excel auto-detects encoding.

const csvCell = (v) => {
    if (v == null) return ''
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const csvRow = (cells) => cells.map(csvCell).join(',')
const fmt2 = (n) => Number(n || 0).toFixed(2)

const sendCsv = (res, filename, lines) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    // BOM helps Excel detect UTF-8 — without it, ₹ and accented chars break.
    res.write('\uFEFF')
    res.write(lines.join('\r\n'))
    res.end()
}

// GET /api/reports/gstr1.csv  (same query params as JSON endpoint)
exports.exportGstr1Csv = async (req, res, next) => {
    try {
        const from = parseDateParam(req.query.from, false)
        const to   = parseDateParam(req.query.to, true)
        const previewRate = Number(req.query.previewRate) || 0

        const data = await buildGstReport({
            companyId: req.companyId,
            dateField: 'paymentDate',
            Model: Payment,
            baseFilter: { status: 'paid' },
            from, to, previewRate,
            populateOpts: { path: 'customer', select: 'firstName lastName email' },
        })

        const header = csvRow([
            'Invoice No.', 'Date', 'Customer', 'Customer Email',
            'Mode', 'GST Rate %', 'Taxable Amount', 'CGST', 'SGST', 'IGST', 'Invoice Total',
            'Preview',
        ])
        const rows = data.lineItems.map(r => csvRow([
            r.record.invoiceNumber || '',
            new Date(r.record.paymentDate).toISOString().slice(0, 10),
            `${r.record.customer?.firstName || ''} ${r.record.customer?.lastName || ''}`.trim(),
            r.record.customer?.email || '',
            r.record.mode || '',
            r.rate,
            fmt2(r.taxable), fmt2(r.cgst), fmt2(r.sgst), fmt2(r.igst), fmt2(r.total),
            r.isPreview ? 'YES' : '',
        ]))

        sendCsv(res, `gstr1-${(from || new Date()).toISOString().slice(0,10)}-to-${(to || new Date()).toISOString().slice(0,10)}.csv`,
            [header, ...rows])
    } catch (err) { next(err) }
}

// GET /api/reports/gstr2.csv
exports.exportGstr2Csv = async (req, res, next) => {
    try {
        const from = parseDateParam(req.query.from, false)
        const to   = parseDateParam(req.query.to, true)
        const previewRate = Number(req.query.previewRate) || 0

        const data = await buildGstReport({
            companyId: req.companyId,
            dateField: 'date',
            Model: Expense,
            baseFilter: {},
            from, to, previewRate,
            populateOpts: null,
        })

        const header = csvRow([
            'Date', 'Category', 'Description', 'Supplier', 'Supplier GSTIN',
            'GST Rate %', 'Taxable Amount', 'CGST', 'SGST', 'IGST', 'Total',
            'Preview',
        ])
        const rows = data.lineItems.map(r => csvRow([
            new Date(r.record.date).toISOString().slice(0, 10),
            r.record.category || '',
            r.record.description || '',
            r.record.supplierName || '',
            r.record.supplierGstin || '',
            r.rate,
            fmt2(r.taxable), fmt2(r.cgst), fmt2(r.sgst), fmt2(r.igst), fmt2(r.total),
            r.isPreview ? 'YES' : '',
        ]))

        sendCsv(res, `gstr2-${(from || new Date()).toISOString().slice(0,10)}-to-${(to || new Date()).toISOString().slice(0,10)}.csv`,
            [header, ...rows])
    } catch (err) { next(err) }
}
