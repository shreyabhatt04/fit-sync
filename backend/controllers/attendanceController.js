const Attendance = require('../models/Attendance')
const Customer   = require('../models/Customer')

const findCustomerRecord = async (user) => {
    if (!user?.companyId || !user?.email) return null
    return Customer.findOne({ companyId: user.companyId, email: user.email })
}

// GET /api/attendance
exports.getAttendance = async (req, res, next) => {
    try {
        const { date, month, customerId, limit = 50 } = req.query
        const query = { companyId: req.companyId }

        if (req.user.role === 'customer') {
            const rec = await findCustomerRecord(req.user)
            if (!rec) return res.json({ success: true, data: [] })
            query.customer = rec._id
        } else if (customerId) {
            query.customer = customerId
        }

        if (date) {
            const start = new Date(date); start.setHours(0, 0, 0, 0)
            const end   = new Date(date); end.setHours(23, 59, 59, 999)
            query.date = { $gte: start, $lte: end }
        }

        if (month) {
            const [year, m] = month.split('-')
            query.date = {
                $gte: new Date(year, m - 1, 1),
                $lt:  new Date(year, m, 1),
            }
        }

        const records = await Attendance.find(query)
            .populate('customer', 'firstName lastName')
            .sort({ date: -1 })
            .limit(Number(limit))

        res.json({ success: true, data: records })
    } catch (err) { next(err) }
}

// POST /api/attendance — bulk mark attendance
exports.markAttendance = async (req, res, next) => {
    try {
        const { records } = req.body
        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ success: false, message: 'records array is required' })
        }

        // Verify all customers belong to this company (prevent cross-tenant writes)
        const customerIds = [...new Set(records.map(r => r.customerId).filter(Boolean))]
        const valid = await Customer.find({
            _id: { $in: customerIds },
            companyId: req.companyId,
        }).select('_id').lean()
        const validSet = new Set(valid.map(c => String(c._id)))

        const results = []
        const errors = []

        for (const record of records) {
            if (!validSet.has(String(record.customerId))) {
                errors.push({ customerId: record.customerId, error: 'not in this company' })
                continue
            }

            // Normalize date to exact midnight UTC-agnostic
            const rawDate = record.date ? new Date(record.date) : new Date()
            const date = new Date(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate())

            try {
                // Use a two-step: check-then-upsert to avoid unique-index races
                const existing = await Attendance.findOne({
                    customer: record.customerId,
                    date: { $gte: date, $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000) },
                })

                if (existing) {
                    existing.status   = record.status
                    existing.checkIn  = record.checkIn  || ''
                    existing.checkOut = record.checkOut || ''
                    await existing.save()
                    results.push(existing)
                } else {
                    const created = await Attendance.create({
                        customer:  record.customerId,
                        date,
                        status:    record.status,
                        checkIn:   record.checkIn  || '',
                        checkOut:  record.checkOut || '',
                        companyId: req.companyId,
                    })
                    results.push(created)
                }
            } catch (err) {
                console.error('[markAttendance] record failed:', err.message)
                errors.push({ customerId: record.customerId, error: err.message })
            }
        }

        res.json({
            success: true,
            data: results,
            message: `Saved ${results.length} record${results.length !== 1 ? 's' : ''}${errors.length ? ` (${errors.length} failed)` : ''}`,
            errors: errors.length ? errors : undefined,
        })
    } catch (err) { next(err) }
}

// GET /api/attendance/summary
exports.getAttendanceSummary = async (req, res, next) => {
    try {
        const { month } = req.query
        const now = new Date()
        const [year, m] = (month || `${now.getFullYear()}-${now.getMonth() + 1}`).split('-')
        const start = new Date(year, m - 1, 1)
        const end   = new Date(year, m, 1)

        const summary = await Attendance.aggregate([
            { $match: { companyId: req.companyId, date: { $gte: start, $lt: end } } },
            {
                $group: {
                    _id: '$customer',
                    present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
                    absent:  { $sum: { $cond: [{ $eq: ['$status', 'absent'] },  1, 0] } },
                },
            },
        ])

        res.json({ success: true, data: summary })
    } catch (err) { next(err) }
}
