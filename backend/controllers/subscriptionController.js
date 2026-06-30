const Subscription = require('../models/Subscription')
const Customer     = require('../models/Customer')

// Resolve the Customer record belonging to a logged-in customer user.
// We look it up by (companyId + email) which is the unique compound key.
const findCustomerRecord = async (user) => {
    if (!user?.companyId || !user?.email) return null
    return Customer.findOne({ companyId: user.companyId, email: user.email })
}

// GET /api/subscriptions
exports.getSubscriptions = async (req, res, next) => {
    try {
        const { status, customer, page = 1, limit = 10 } = req.query
        const query = { companyId: req.companyId }

        if (req.user.role === 'customer') {
            const rec = await findCustomerRecord(req.user)
            if (!rec) return res.json({ success: true, data: [], pagination: { total: 0, page: 1, pages: 0 } })
            query.customer = rec._id
        } else {
            if (customer) query.customer = customer
            if (status)   query.status   = status
        }

        const total = await Subscription.countDocuments(query)
        const subs = await Subscription.find(query)
            .populate('customer',   'firstName lastName email phone')
            .populate('membership', 'name price duration features')
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort({ createdAt: -1 })

        res.json({
            success: true,
            data: subs,
            pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
        })
    } catch (err) { next(err) }
}

// POST /api/subscriptions
exports.createSubscription = async (req, res, next) => {
    try {
        // Verify the target customer belongs to this company
        const targetCustomer = await Customer.findOne({
            _id: req.body.customer,
            companyId: req.companyId,
        })
        if (!targetCustomer) {
            res.statusCode = 400
            throw new Error('Customer not found in this company')
        }

        const sub = await Subscription.create({ ...req.body, companyId: req.companyId })

        // Flip customer status to active when they get a new subscription
        await Customer.findByIdAndUpdate(targetCustomer._id, { status: 'active' })

        const populated = await sub.populate([
            { path: 'customer',   select: 'firstName lastName email' },
            { path: 'membership', select: 'name price duration' },
        ])

        res.status(201).json({ success: true, data: populated, message: 'Subscription created' })
    } catch (err) { next(err) }
}

// PUT /api/subscriptions/:id
exports.updateSubscription = async (req, res, next) => {
    try {
        const { companyId, ...safe } = req.body
        const sub = await Subscription.findOneAndUpdate(
            { _id: req.params.id, companyId: req.companyId },
            safe,
            { new: true, runValidators: true }
        )
            .populate('customer',   'firstName lastName')
            .populate('membership', 'name')

        if (!sub) { res.statusCode = 404; throw new Error('Subscription not found') }
        res.json({ success: true, data: sub, message: 'Subscription updated' })
    } catch (err) { next(err) }
}

// DELETE /api/subscriptions/:id
exports.deleteSubscription = async (req, res, next) => {
    try {
        const sub = await Subscription.findOneAndDelete({
            _id: req.params.id,
            companyId: req.companyId,
        })
        if (!sub) { res.statusCode = 404; throw new Error('Subscription not found') }
        res.json({ success: true, message: 'Subscription deleted' })
    } catch (err) { next(err) }
}

// GET /api/subscriptions/renewals/upcoming
exports.getUpcomingRenewals = async (req, res, next) => {
    try {
        const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        const renewals = await Subscription.find({
            companyId: req.companyId,
            status: 'active',
            endDate: { $lte: sevenDaysLater, $gte: new Date() },
        })
            .populate('customer',   'firstName lastName phone')
            .populate('membership', 'name')
            .sort({ endDate: 1 })

        res.json({ success: true, data: renewals })
    } catch (err) { next(err) }
}
