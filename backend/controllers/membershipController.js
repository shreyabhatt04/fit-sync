const Membership = require('../models/Membership')

// GET /api/memberships
exports.getMemberships = async (req, res, next) => {
    try {
        // Customers see their gym's active plans too (for the My Subscription page)
        const query = { companyId: req.companyId }
        // If called from a staff/customer role, only show active ones
        if (req.user.role !== 'admin') query.isActive = true

        const memberships = await Membership.find(query).sort({ price: 1 })
        res.json({ success: true, data: memberships })
    } catch (err) { next(err) }
}

// POST /api/memberships
exports.createMembership = async (req, res, next) => {
    try {
        const membership = await Membership.create({ ...req.body, companyId: req.companyId })
        res.status(201).json({ success: true, data: membership, message: 'Plan created' })
    } catch (err) { next(err) }
}

// PUT /api/memberships/:id
exports.updateMembership = async (req, res, next) => {
    try {
        const { companyId, ...safe } = req.body
        const membership = await Membership.findOneAndUpdate(
            { _id: req.params.id, companyId: req.companyId },
            safe,
            { new: true, runValidators: true }
        )
        if (!membership) { res.statusCode = 404; throw new Error('Plan not found') }
        res.json({ success: true, data: membership, message: 'Plan updated' })
    } catch (err) { next(err) }
}

// DELETE /api/memberships/:id  (soft delete — just set isActive=false)
exports.deleteMembership = async (req, res, next) => {
    try {
        const membership = await Membership.findOneAndUpdate(
            { _id: req.params.id, companyId: req.companyId },
            { isActive: false },
            { new: true }
        )
        if (!membership) { res.statusCode = 404; throw new Error('Plan not found') }
        res.json({ success: true, message: 'Plan deleted' })
    } catch (err) { next(err) }
}
