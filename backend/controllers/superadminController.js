const crypto       = require('crypto')
const Company      = require('../models/Company')
const User         = require('../models/User')
const Customer     = require('../models/Customer')
const Payment      = require('../models/Payment')
const Subscription = require('../models/Subscription')
const ModulePrice  = require('../models/ModulePrice')
const PlatformInvoice = require('../models/PlatformInvoice')
const { sendInviteEmail } = require('../utils/email')

// ─────────────────────────────────────────────────────────────────
// GET /api/superadmin/dashboard
// Top-level stats across all companies
// ─────────────────────────────────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
    try {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        // Build the upper bound for the broadest expiry window we report on
        // (15 days). We'll fetch once and bucketize in JS — three separate
        // queries would each scan the same index range.
        const fifteenDaysLater = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)

        const [
            totalCompanies,
            activeCompanies,
            trialCompanies,
            expiredCompanies,
            suspendedCompanies,
            totalUsers,
            totalRevenue,
            monthRevenue,
            recentCompanies,
            expiringSoon,
            recentSubs,
        ] = await Promise.all([
            Company.countDocuments({}),
            Company.countDocuments({ status: 'active' }),
            Company.countDocuments({ status: 'trial' }),
            Company.countDocuments({ status: 'expired' }),
            Company.countDocuments({ status: 'suspended' }),
            User.countDocuments({ role: { $ne: 'superadmin' } }),
            Payment.aggregate([
                { $match: { status: 'paid' } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Payment.aggregate([
                { $match: { status: 'paid', paymentDate: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Company.find({})
                .populate('ownerId', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
            // Anything expiring within the next 15 days — the broadest
            // tier we report on. Includes both 'trial' and 'active' companies
            // because the same trialEndsAt field also stores the renewal date
            // for paid companies in this codebase.
            Company.find({
                status: { $in: ['trial', 'active'] },
                trialEndsAt: { $gte: now, $lte: fifteenDaysLater },
            })
                .select('name slug trialEndsAt status')
                .sort({ trialEndsAt: 1 })
                .lean(),
            Subscription.find({})
                .populate('companyId',  'name slug')
                .populate('customer',   'firstName lastName')
                .populate('membership', 'name duration')
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
        ])

        // Bucketize into 1 / 7 / 15 day tiers — matching the customer
        // membership cron tiers (batch 4) so the language is consistent
        // across the platform. Each company appears in exactly ONE bucket
        // (the most urgent it qualifies for).
        const within1Day  = []
        const within7Day  = []   // expiring in 2–7 days
        const within15Day = []   // expiring in 8–15 days
        for (const c of expiringSoon) {
            const msLeft = new Date(c.trialEndsAt).getTime() - now.getTime()
            const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000))
            const entry = {
                _id: c._id,
                name: c.name,
                slug: c.slug,
                status: c.status,
                endDate: c.trialEndsAt,
                daysLeft,
            }
            if (daysLeft <= 1)      within1Day.push(entry)
            else if (daysLeft <= 7) within7Day.push(entry)
            else                    within15Day.push(entry)
        }

        res.json({
            success: true,
            data: {
                stats: {
                    totalCompanies,
                    activeCompanies,
                    trialCompanies,
                    expiredCompanies,
                    suspendedCompanies,
                    totalUsers,
                    totalRevenueRupees: totalRevenue[0]?.total || 0,
                    monthRevenueRupees: monthRevenue[0]?.total || 0,
                },
                recentCompanies,
                // New tiered structure (Batch 16, guide feedback #11a) —
                // alert banners read this directly per tier.
                expiringByTier: {
                    within1Day,
                    within7Day,
                    within15Day,
                    total: within1Day.length + within7Day.length + within15Day.length,
                },
                // Backward-compat: keep the old shape so any older client
                // build still works during a rolling deploy. Same data the
                // pre-batch banner consumed (anything in the next 7 days).
                expiringThisWeek: [...within1Day, ...within7Day].map(c => ({
                    _id: c._id,
                    companyId: { name: c.name, slug: c.slug },
                    endDate: c.endDate,
                })),
                recentSubscriptions: recentSubs,
            },
        })
    } catch (err) { next(err) }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/superadmin/companies
// List all companies with pagination + search + filter
// ─────────────────────────────────────────────────────────────────
exports.getCompanies = async (req, res, next) => {
    try {
        const { status, plan, search, page = 1, limit = 15 } = req.query

        const filter = {}
        if (status) filter.status = status
        if (plan)   filter.plan   = plan
        if (search) {
            filter.$or = [
                { name:  { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { slug:  { $regex: search, $options: 'i' } },
            ]
        }

        const skip = (parseInt(page) - 1) * parseInt(limit)
        const total = await Company.countDocuments(filter)
        const companies = await Company.find(filter)
            .populate('ownerId', 'firstName lastName email phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean()

        // Attach real member count per company
        const withCounts = await Promise.all(companies.map(async (c) => ({
            ...c,
            memberCount: await Customer.countDocuments({ companyId: c._id }),
        })))

        res.json({
            success: true,
            data: withCounts,
            pagination: {
                total,
                page:  parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit)),
            },
        })
    } catch (err) { next(err) }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/superadmin/companies/:id
// Full company detail with subscriptions + users
// ─────────────────────────────────────────────────────────────────
exports.getCompanyDetail = async (req, res, next) => {
    try {
        const company = await Company.findById(req.params.id)
            .populate('ownerId', 'firstName lastName email phone')
            .lean()

        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' })
        }

        const [memberCount, subscriptions, users] = await Promise.all([
            Customer.countDocuments({ companyId: company._id }),
            Subscription.find({ companyId: company._id })
                .populate('customer',   'firstName lastName email')
                .populate('membership', 'name price duration')
                .sort({ createdAt: -1 })
                .limit(20)
                .lean(),
            User.find({ companyId: company._id })
                .select('-password -emailOtp -emailOtpExpiry -passwordResetToken -passwordResetExpiry')
                .sort({ createdAt: -1 })
                .lean(),
        ])

        res.json({
            success: true,
            data: {
                company: { ...company, memberCount },
                subscriptions,
                users,
            },
        })
    } catch (err) { next(err) }
}

// ─────────────────────────────────────────────────────────────────
// PATCH /api/superadmin/companies/:id/status
// ─────────────────────────────────────────────────────────────────
exports.setCompanyStatus = async (req, res, next) => {
    try {
        const { status } = req.body
        const valid = ['active', 'suspended', 'trial', 'expired']
        if (!valid.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status must be one of: ${valid.join(', ')}`,
            })
        }

        const company = await Company.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate('ownerId', 'firstName lastName email phone')
        if (!company) return res.status(404).json({ success: false, message: 'Company not found' })
        res.json({ success: true, data: company, message: `Company marked as ${status}` })
    } catch (err) { next(err) }
}

// ─────────────────────────────────────────────────────────────────
// PATCH /api/superadmin/companies/:id/extend-trial
// Body: { days: number }
// ─────────────────────────────────────────────────────────────────
exports.extendTrial = async (req, res, next) => {
    try {
        const days = Number(req.body.days) || 14
        if (days <= 0 || days > 365) {
            return res.status(400).json({
                success: false,
                message: 'Extension must be between 1 and 365 days',
            })
        }

        const company = await Company.findById(req.params.id)
        if (!company) return res.status(404).json({ success: false, message: 'Company not found' })

        // Start from today or existing trialEndsAt (whichever is later)
        const base = company.trialEndsAt && company.trialEndsAt > new Date()
            ? new Date(company.trialEndsAt)
            : new Date()
        base.setDate(base.getDate() + days)

        company.trialEndsAt = base
        if (company.status === 'expired') company.status = 'trial'
        await company.save()

        // Populate ownerId before returning so the frontend's detail
        // view keeps the owner name/email after this PATCH (Batch 26).
        await company.populate('ownerId', 'firstName lastName email phone')

        res.json({ success: true, data: company, message: `Trial extended by ${days} days` })
    } catch (err) { next(err) }
}

// ─────────────────────────────────────────────────────────────────
// PATCH /api/superadmin/companies/:id/modules
// Body: { modules: { reports: true, tasks: false, ... } }
// ─────────────────────────────────────────────────────────────────
exports.updateModules = async (req, res, next) => {
    try {
        const { modules } = req.body
        if (!modules || typeof modules !== 'object') {
            return res.status(400).json({ success: false, message: 'modules object is required' })
        }

        const setObj = {}
        for (const [key, value] of Object.entries(modules)) {
            setObj[`modules.${key}`] = Boolean(value)
        }

        const company = await Company.findByIdAndUpdate(
            req.params.id,
            { $set: setObj },
            { new: true }
        ).populate('ownerId', 'firstName lastName email phone')
        if (!company) return res.status(404).json({ success: false, message: 'Company not found' })
        res.json({ success: true, data: company, message: 'Modules updated' })
    } catch (err) { next(err) }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/superadmin/users
// ─────────────────────────────────────────────────────────────────
exports.getUsers = async (req, res, next) => {
    try {
        const { role, search, page = 1, limit = 15 } = req.query
        const filter = { role: { $ne: 'superadmin' } }
        if (role) filter.role = role
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName:  { $regex: search, $options: 'i' } },
                { email:     { $regex: search, $options: 'i' } },
            ]
        }

        const skip  = (parseInt(page) - 1) * parseInt(limit)
        const total = await User.countDocuments(filter)
        const users = await User.find(filter)
            .select('-password -emailOtp -emailOtpExpiry -passwordResetToken -passwordResetExpiry')
            .populate('companyId', 'name slug')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))

        res.json({
            success: true,
            data: users,
            pagination: {
                total,
                page:  parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit)),
            },
        })
    } catch (err) { next(err) }
}

// ─────────────────────────────────────────────────────────────────
// PATCH /api/superadmin/users/:id/toggle-active
// ─────────────────────────────────────────────────────────────────
exports.toggleUserActive = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id)
        if (!user) return res.status(404).json({ success: false, message: 'User not found' })
        if (user.role === 'superadmin') {
            return res.status(403).json({ success: false, message: 'Cannot modify superadmin' })
        }

        user.isActive = !user.isActive
        await user.save()

        res.json({
            success: true,
            message: `User ${user.isActive ? 'activated' : 'deactivated'}`,
            data: { isActive: user.isActive },
        })
    } catch (err) { next(err) }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/superadmin/subscriptions
// All customer subscriptions across all companies
// ─────────────────────────────────────────────────────────────────
exports.getAllSubscriptions = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 15 } = req.query
        const filter = {}
        if (status) filter.status = status

        const skip  = (parseInt(page) - 1) * parseInt(limit)
        const total = await Subscription.countDocuments(filter)
        const subs  = await Subscription.find(filter)
            .populate('customer',   'firstName lastName email phone')
            .populate('membership', 'name duration price')
            .populate('companyId',  'name slug')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))

        res.json({
            success: true,
            data: subs,
            pagination: {
                total,
                page:  parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit)),
            },
        })
    } catch (err) { next(err) }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/superadmin/revenue
// 6-month revenue chart across all companies
// ─────────────────────────────────────────────────────────────────
exports.getRevenueChart = async (req, res, next) => {
    try {
        const months = []
        for (let i = 5; i >= 0; i--) {
            const d = new Date()
            d.setMonth(d.getMonth() - i)
            const start = new Date(d.getFullYear(), d.getMonth(), 1)
            const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1)

            const result = await Payment.aggregate([
                { $match: { status: 'paid', paymentDate: { $gte: start, $lt: end } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ])

            months.push({
                month:   d.toLocaleString('en-IN', { month: 'short', year: 'numeric' }),
                revenue: result[0]?.total || 0,
            })
        }
        res.json({ success: true, data: months })
    } catch (err) { next(err) }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/superadmin/module-prices
// ─────────────────────────────────────────────────────────────────
exports.getModulePrices = async (req, res, next) => {
    try {
        const prices = await ModulePrice.find({}).sort({ sortOrder: 1 })
        res.json({ success: true, data: prices })
    } catch (err) { next(err) }
}

// ─────────────────────────────────────────────────────────────────
// PUT /api/superadmin/module-prices/:id
// ─────────────────────────────────────────────────────────────────
exports.updateModulePrice = async (req, res, next) => {
    try {
        const { label, description, pricing, isActive, sortOrder } = req.body
        const updates = {}
        if (label       !== undefined) updates.label       = label
        if (description !== undefined) updates.description = description
        if (pricing     !== undefined) updates.pricing     = pricing
        if (isActive    !== undefined) updates.isActive    = Boolean(isActive)
        if (sortOrder   !== undefined) updates.sortOrder   = Number(sortOrder)

        const price = await ModulePrice.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true,
        })
        if (!price) return res.status(404).json({ success: false, message: 'Module price not found' })
        res.json({ success: true, data: price, message: 'Price updated' })
    } catch (err) { next(err) }
}

// ─────────────────────────────────────────────────────────────────
// Platform Billing — Batch 17 (guide feedback #11b)
//
// CRUD over PlatformInvoice. All endpoints are superadmin-only — they
// already inherit that from router.use(authorize('superadmin')) in
// superadminRoutes.js.
// ─────────────────────────────────────────────────────────────────

// GET /api/superadmin/platform-invoices?companyId=&status=&from=&to=&page=&limit=
exports.getPlatformInvoices = async (req, res, next) => {
    try {
        const { companyId, status, from, to, page = 1, limit = 15 } = req.query
        const filter = {}
        if (companyId) filter.companyId = companyId
        if (status)    filter.status    = status
        if (from || to) {
            filter.issuedAt = {}
            if (from) filter.issuedAt.$gte = new Date(from)
            if (to) {
                const end = new Date(to)
                end.setHours(23, 59, 59, 999)
                filter.issuedAt.$lte = end
            }
        }

        const total = await PlatformInvoice.countDocuments(filter)
        const invoices = await PlatformInvoice.find(filter)
            .populate('companyId', 'name slug status')
            .sort({ issuedAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .lean()

        res.json({
            success: true,
            data: invoices,
            pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
        })
    } catch (err) { next(err) }
}

// GET /api/superadmin/platform-invoices/stats
// Headline numbers for the billing page summary cards.
exports.getPlatformInvoiceStats = async (req, res, next) => {
    try {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const startOfYear  = new Date(now.getFullYear(), 0, 1)

        const [paidAggMonth, paidAggYear, dueCount, overdueCount] = await Promise.all([
            PlatformInvoice.aggregate([
                { $match: { status: 'paid', paidAt: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$total' } } },
            ]),
            PlatformInvoice.aggregate([
                { $match: { status: 'paid', paidAt: { $gte: startOfYear } } },
                { $group: { _id: null, total: { $sum: '$total' } } },
            ]),
            PlatformInvoice.countDocuments({ status: 'due' }),
            PlatformInvoice.countDocuments({ status: 'overdue' }),
        ])

        res.json({
            success: true,
            data: {
                paidThisMonth: paidAggMonth[0]?.total || 0,
                paidThisYear:  paidAggYear[0]?.total  || 0,
                openDue:       dueCount,
                overdue:       overdueCount,
            },
        })
    } catch (err) { next(err) }
}

// POST /api/superadmin/platform-invoices
exports.createPlatformInvoice = async (req, res, next) => {
    try {
        const {
            companyId, billingPeriodStart, billingPeriodEnd,
            lineItems, dueDate, status, paymentMode, paidAt, notes, gst,
        } = req.body

        if (!companyId || !billingPeriodStart || !billingPeriodEnd || !lineItems || !dueDate) {
            res.statusCode = 400
            throw new Error('companyId, billingPeriodStart, billingPeriodEnd, lineItems, and dueDate are required')
        }

        const company = await Company.findById(companyId)
        if (!company) { res.statusCode = 404; throw new Error('Company not found') }

        const subtotal = lineItems.reduce((s, li) => s + Number(li.amount || 0), 0)
        const gstAmount = gst != null ? Number(gst) : +(subtotal * 0.18).toFixed(2)
        const total    = subtotal + gstAmount

        const invoice = await PlatformInvoice.create({
            companyId,
            billingPeriodStart, billingPeriodEnd,
            lineItems,
            subtotal,
            gst: gstAmount,
            total,
            status: status || 'due',
            dueDate,
            paymentMode: paymentMode || null,
            paidAt: paidAt || (status === 'paid' ? new Date() : null),
            notes: notes || '',
        })
        const populated = await invoice.populate('companyId', 'name slug status')
        res.status(201).json({ success: true, data: populated, message: 'Platform invoice created' })
    } catch (err) { next(err) }
}

// PATCH /api/superadmin/platform-invoices/:id
// Used for marking paid, updating notes, changing status, etc.
exports.updatePlatformInvoice = async (req, res, next) => {
    try {
        // Whitelist updatable fields. We never let the client mutate
        // invoiceNumber / lineItems / amounts directly — to change those
        // they should cancel + reissue.
        const allowed = ['status', 'paymentMode', 'paidAt', 'notes', 'dueDate']
        const updates = {}
        for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k]

        // If transitioning to 'paid' without an explicit paidAt, stamp now.
        if (updates.status === 'paid' && !updates.paidAt) {
            updates.paidAt = new Date()
        }
        // If moving away from 'paid', clear paidAt unless the client supplied one.
        if (updates.status && updates.status !== 'paid' && req.body.paidAt === undefined) {
            updates.paidAt = null
        }

        const inv = await PlatformInvoice.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
            .populate('companyId', 'name slug status')
        if (!inv) { res.statusCode = 404; throw new Error('Platform invoice not found') }
        res.json({ success: true, data: inv, message: 'Invoice updated' })
    } catch (err) { next(err) }
}

// DELETE /api/superadmin/platform-invoices/:id
exports.deletePlatformInvoice = async (req, res, next) => {
    try {
        const deleted = await PlatformInvoice.findByIdAndDelete(req.params.id)
        if (!deleted) { res.statusCode = 404; throw new Error('Platform invoice not found') }
        res.json({ success: true, message: 'Platform invoice deleted' })
    } catch (err) { next(err) }
}

// ─────────────────────────────────────────────────────────────────
// Module-wise analytics — Batch 18 (guide feedback #11c)
//
// Single endpoint returning three blocks the SuperadminModuleReports page
// renders as separate charts:
//
//   1. modulesAdoption     — % of gyms that have each module enabled
//   2. customersPerModule  — avg customer count among gyms with each module
//   3. revenuePerModule    — total platform revenue per module (from paid
//                            PlatformInvoice line items)
//
// All three iterate the same fixed list of MODULE_NAMES so the frontend
// can render them in a consistent order across charts.
// ─────────────────────────────────────────────────────────────────

const MODULE_NAMES = [
    { key: 'members',      label: 'Members'      },
    { key: 'attendance',   label: 'Attendance'   },
    { key: 'payments',     label: 'Payments'     },
    { key: 'memberships',  label: 'Memberships'  },
    { key: 'reports',      label: 'Reports'      },
    { key: 'tasks',        label: 'Tasks'        },
    { key: 'targets',      label: 'Targets'      },
    { key: 'promotions',   label: 'Promotions'   },
    { key: 'staff',        label: 'Staff'        },
]

// GET /api/superadmin/module-analytics
exports.getModuleAnalytics = async (req, res, next) => {
    try {
        // Pull all companies once — we need both their module map and _id
        // to do the customer-count join in JS. This is fine at college-
        // project scale (tens of gyms). At thousands of gyms you'd want
        // an aggregation pipeline instead.
        const companies = await Company.find({}).select('_id modules').lean()
        const totalCompanies = companies.length

        // 1. Adoption count per module
        const adoptionCounts = {}
        for (const m of MODULE_NAMES) adoptionCounts[m.key] = 0
        for (const c of companies) {
            for (const m of MODULE_NAMES) {
                if (c.modules?.[m.key]) adoptionCounts[m.key]++
            }
        }

        // 2. Customer count per gym → average per module
        // One aggregation grouped by companyId is much cheaper than N counts.
        const customerCounts = await Customer.aggregate([
            { $group: { _id: '$companyId', count: { $sum: 1 } } },
        ])
        const customersByCompany = new Map(
            customerCounts.map(r => [String(r._id), r.count])
        )

        // 3. Revenue per module from PlatformInvoice line items.
        // We use $unwind + $group because lineItems is an array. Only paid
        // invoices count toward revenue.
        const revenueByModule = await PlatformInvoice.aggregate([
            { $match: { status: 'paid' } },
            { $unwind: '$lineItems' },
            { $group: {
                _id: '$lineItems.module',
                revenue: { $sum: '$lineItems.amount' },
                invoiceCount: { $sum: 1 },
            } },
        ])
        const revenueMap = new Map(
            revenueByModule.map(r => [r._id, { revenue: r.revenue, invoiceCount: r.invoiceCount }])
        )

        // Build the response in MODULE_NAMES order so charts align.
        const modulesAdoption = MODULE_NAMES.map(m => ({
            module: m.key,
            label:  m.label,
            enabledGyms: adoptionCounts[m.key],
            totalGyms:   totalCompanies,
            percentage:  totalCompanies > 0
                ? Math.round((adoptionCounts[m.key] / totalCompanies) * 100)
                : 0,
        }))

        const customersPerModule = MODULE_NAMES.map(m => {
            const enabledCompanies = companies.filter(c => c.modules?.[m.key])
            if (enabledCompanies.length === 0) {
                return { module: m.key, label: m.label, enabledGyms: 0, avgCustomers: 0, totalCustomers: 0 }
            }
            const customerSums = enabledCompanies.map(c => customersByCompany.get(String(c._id)) || 0)
            const totalCustomers = customerSums.reduce((s, n) => s + n, 0)
            return {
                module: m.key,
                label:  m.label,
                enabledGyms:    enabledCompanies.length,
                avgCustomers:   Math.round(totalCustomers / enabledCompanies.length),
                totalCustomers,
            }
        })

        const revenuePerModule = MODULE_NAMES.map(m => {
            const r = revenueMap.get(m.key) || { revenue: 0, invoiceCount: 0 }
            return {
                module: m.key,
                label:  m.label,
                revenue: r.revenue,
                invoiceCount: r.invoiceCount,
            }
        })

        res.json({
            success: true,
            data: {
                totalCompanies,
                modulesAdoption,
                customersPerModule,
                revenuePerModule,
            },
        })
    } catch (err) { next(err) }
}

// ─────────────────────────────────────────────────────────────────
// Invitations & Approvals (Batch 21, guide feedback #5/#6/#7)
//
// Two flows live here:
//
//   1. inviteGymAdmin — superadmin sends a gym-admin invite. Creates a
//      Company shell + a pending User, then emails the invite link.
//      Different from auth.sendInvite (which is gym-admin → staff/customer).
//
//   2. Pending approvals — list/approve/reject gym admins who registered
//      via the open /signup form (which now sets verificationStatus
//      to 'pending' instead of 'approved').
// ─────────────────────────────────────────────────────────────────

const slugifyName = (s) =>
    String(s || 'gym').toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50)

// POST /api/superadmin/invite-admin
// Body: { email, firstName, lastName, gymName, phone? }
// Creates a pending Company + admin User and emails the invite link.
exports.inviteGymAdmin = async (req, res, next) => {
    try {
        const { email, firstName, lastName, gymName, phone } = req.body
        if (!email || !firstName || !gymName) {
            return res.status(400).json({
                success: false,
                message: 'email, firstName, and gymName are required',
            })
        }
        const emailLower = email.toLowerCase().trim()

        const existing = await User.findOne({ email: emailLower })
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'A user with this email already exists',
            })
        }

        // Create the gym (status starts as trial — superadmin can change later)
        let baseSlug = slugifyName(gymName)
        let slug = baseSlug
        let suffix = 1
        while (await Company.findOne({ slug })) {
            slug = `${baseSlug}-${suffix++}`
        }
        const company = await Company.create({
            name: gymName.trim(),
            slug,
            email: emailLower,
            phone: phone || '',
            status: 'trial',
            plan: 'trial',
        })

        // Create the pending User. isActive=false until they accept the
        // invite; verificationStatus stays as the schema default ('approved')
        // because the superadmin's act of inviting them IS the approval.
        const rawToken  = crypto.randomBytes(32).toString('hex')
        const hashToken = crypto.createHash('sha256').update(rawToken).digest('hex')
        const placeholderPwd = crypto.randomBytes(16).toString('hex')

        let user
        try {
            user = await User.create({
                firstName,
                lastName: lastName || '',
                email: emailLower,
                phone: phone || '',
                password: placeholderPwd,
                role: 'admin',
                companyId: company._id,
                isActive: false,
                isEmailVerified: false,
                verificationStatus: 'approved',
                passwordResetToken: hashToken,
                passwordResetExpiry: new Date(Date.now() + 48 * 60 * 60 * 1000),
                invitedBy: req.user._id,
            })
        } catch (err) {
            await Company.findByIdAndDelete(company._id).catch(() => {})
            throw err
        }

        company.ownerId = user._id
        await company.save()

        const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/accept-invite/${rawToken}`

        // Fire and forget — never block response on email
        sendInviteEmail({
            to: user.email,
            gymName: company.name,
            inviterName: 'FitSync Platform',
            role: 'admin',
            inviteUrl,
        }).catch(e => console.error('[inviteGymAdmin] Email failed:', e.message))

        res.status(201).json({
            success: true,
            message: `Invite sent to ${email}`,
            data: {
                _id: user._id,
                email: user.email,
                gymName: company.name,
                inviteUrl,  // surfaced for cases when email isn't configured
            },
        })
    } catch (err) { next(err) }
}

// GET /api/superadmin/pending-approvals
// Lists gym admins whose verificationStatus is 'pending' — they signed
// up via the open form and are waiting for superadmin to vet them.
//
// When email is configured (Batch 22, guide feedback #8), we ALSO require
// isEmailVerified=true. Showing unverified users in the approval queue
// just clutters the page — the superadmin can't usefully act on them
// because they could be anyone.
exports.getPendingGymAdmins = async (req, res, next) => {
    try {
        const filter = {
            role: 'admin',
            verificationStatus: 'pending',
        }
        const emailEnabled = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS)
        if (emailEnabled) {
            filter.isEmailVerified = true
        }

        const list = await User.find(filter)
            .populate('companyId', 'name slug city state')
            .sort({ createdAt: -1 })
            .lean()

        res.json({ success: true, data: list, total: list.length })
    } catch (err) { next(err) }
}

// POST /api/superadmin/pending-approvals/:userId/approve
exports.approveGymAdmin = async (req, res, next) => {
    try {
        const user = await User.findOneAndUpdate(
            { _id: req.params.userId, role: 'admin', verificationStatus: 'pending' },
            { $set: { verificationStatus: 'approved' } },
            { new: true },
        ).populate('companyId', 'name')
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Pending gym admin not found',
            })
        }
        res.json({
            success: true,
            message: `${user.firstName} approved. They can now log in.`,
            data: { _id: user._id, email: user.email, gymName: user.companyId?.name },
        })
    } catch (err) { next(err) }
}

// POST /api/superadmin/pending-approvals/:userId/reject
exports.rejectGymAdmin = async (req, res, next) => {
    try {
        const user = await User.findOneAndUpdate(
            { _id: req.params.userId, role: 'admin', verificationStatus: 'pending' },
            { $set: { verificationStatus: 'rejected' } },
            { new: true },
        )
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Pending gym admin not found',
            })
        }
        res.json({
            success: true,
            message: `${user.firstName}'s registration was rejected.`,
        })
    } catch (err) { next(err) }
}
