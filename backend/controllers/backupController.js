const BackupRecord = require('../models/BackupRecord')
const Customer     = require('../models/Customer')
const Subscription = require('../models/Subscription')
const Payment      = require('../models/Payment')
const Attendance   = require('../models/Attendance')
const Expense      = require('../models/Expense')
const Enquiry      = require('../models/Enquiry')
const Membership   = require('../models/Membership')
const Task         = require('../models/Task')
const Target       = require('../models/Target')

// GET /api/backup/download
exports.downloadBackup = async (req, res, next) => {
    try {
        const companyId = req.companyId

        const [customers, subscriptions, payments, attendance, expenses, enquiries, memberships, tasks, targets] = await Promise.all([
            Customer.find({ companyId }).lean(),
            Subscription.find({ companyId })
                .populate('customer', 'firstName lastName email')
                .populate('membership', 'name duration')
                .lean(),
            Payment.find({ companyId })
                .populate('customer', 'firstName lastName email')
                .lean(),
            Attendance.find({ companyId })
                .populate('customer', 'firstName lastName')
                .lean(),
            Expense.find({ companyId }).lean(),
            Enquiry.find({ companyId }).lean(),
            Membership.find({ companyId }).lean(),
            Task.find({ companyId }).lean(),
            Target.find({ companyId }).lean(),
        ])

        const now = new Date()
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
        const filename = `fitsync-backup-${req.company.slug}-${timestamp}.json`

        const payload = {
            meta: {
                exportedAt: now.toISOString(),
                exportedBy: req.user.email,
                companyName: req.company.name,
                companySlug: req.company.slug,
                version: '1.0',
            },
            counts: {
                customers: customers.length, subscriptions: subscriptions.length,
                payments: payments.length, attendance: attendance.length,
                expenses: expenses.length, enquiries: enquiries.length,
                memberships: memberships.length, tasks: tasks.length, targets: targets.length,
            },
            data: { customers, subscriptions, payments, attendance, expenses, enquiries, memberships, tasks, targets },
        }

        const json = JSON.stringify(payload, null, 2)
        const sizeBytes = Buffer.byteLength(json, 'utf8')

        await BackupRecord.create({ filename, sizeBytes, counts: payload.counts, companyId })

        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        res.setHeader('Content-Length', sizeBytes)
        res.send(json)
    } catch (err) { next(err) }
}

// GET /api/backup/history
exports.getBackupHistory = async (req, res, next) => {
    try {
        const history = await BackupRecord.find({ companyId: req.companyId })
            .sort({ createdAt: -1 })
            .limit(20)
        res.json({ success: true, data: history })
    } catch (err) { next(err) }
}
