// backend/controllers/notificationController.js — Batch 12

const Notification = require('../models/Notification')
const Customer = require('../models/Customer')

// Resolve the Customer record for a logged-in customer User. Same lookup
// pattern as paymentController. Returns null if the user isn't a customer
// (admin/staff) — caller should branch on role anyway.
const findCustomerRecord = async (user) => {
    if (user.role !== 'customer') return null
    return Customer.findOne({ companyId: user.companyId, email: user.email })
}

// Builds a Mongo filter restricting notifications to what THIS user is
// allowed to see. Admin/staff see audience='admin' for their company.
// Customers see audience='customer' for their own customerId.
const buildScopeFilter = async (req) => {
    const filter = { companyId: req.companyId }
    if (req.user.role === 'customer') {
        const cust = await findCustomerRecord(req.user)
        if (!cust) {
            // No customer record → no notifications. Use a filter that
            // can never match anything.
            filter._id = null
            return filter
        }
        filter.audience = 'customer'
        filter.customerId = cust._id
    } else {
        // admin / staff
        filter.audience = 'admin'
    }
    return filter
}

// GET /api/notifications
// Returns the 50 most recent notifications + an unreadCount the bell can
// use for its badge. Caller can paginate later if real volume shows up.
exports.getMine = async (req, res, next) => {
    try {
        const filter = await buildScopeFilter(req)
        const [list, unreadCount] = await Promise.all([
            Notification.find(filter).sort({ createdAt: -1 }).limit(50),
            Notification.countDocuments({ ...filter, read: false }),
        ])
        res.json({ success: true, data: list, unreadCount })
    } catch (err) { next(err) }
}

// PATCH /api/notifications/read-all
exports.markAllRead = async (req, res, next) => {
    try {
        const filter = await buildScopeFilter(req)
        const result = await Notification.updateMany(
            { ...filter, read: false },
            { $set: { read: true } },
        )
        res.json({ success: true, modified: result.modifiedCount })
    } catch (err) { next(err) }
}

// PATCH /api/notifications/:id/read
exports.markRead = async (req, res, next) => {
    try {
        const filter = await buildScopeFilter(req)
        const updated = await Notification.findOneAndUpdate(
            { ...filter, _id: req.params.id },
            { $set: { read: true } },
            { new: true },
        )
        if (!updated) { res.statusCode = 404; throw new Error('Notification not found') }
        res.json({ success: true, data: updated })
    } catch (err) { next(err) }
}

// DELETE /api/notifications/:id
exports.remove = async (req, res, next) => {
    try {
        const filter = await buildScopeFilter(req)
        const deleted = await Notification.findOneAndDelete({ ...filter, _id: req.params.id })
        if (!deleted) { res.statusCode = 404; throw new Error('Notification not found') }
        res.json({ success: true, message: 'Notification removed' })
    } catch (err) { next(err) }
}
