const Target = require('../models/Target')

// GET /api/targets
exports.getTargets = async (req, res, next) => {
    try {
        const targets = await Target.find({ companyId: req.companyId }).sort({ createdAt: -1 })
        res.json({ success: true, data: targets })
    } catch (err) { next(err) }
}

// POST /api/targets
exports.createTarget = async (req, res, next) => {
    try {
        const target = await Target.create({ ...req.body, companyId: req.companyId })
        res.status(201).json({ success: true, data: target, message: 'Target created' })
    } catch (err) { next(err) }
}

// PUT /api/targets/:id
exports.updateTarget = async (req, res, next) => {
    try {
        const { companyId, ...safe } = req.body
        const target = await Target.findOneAndUpdate(
            { _id: req.params.id, companyId: req.companyId },
            safe,
            { new: true, runValidators: true }
        )
        if (!target) { res.statusCode = 404; throw new Error('Target not found') }
        res.json({ success: true, data: target, message: 'Target updated' })
    } catch (err) { next(err) }
}

// DELETE /api/targets/:id
exports.deleteTarget = async (req, res, next) => {
    try {
        const target = await Target.findOneAndDelete({ _id: req.params.id, companyId: req.companyId })
        if (!target) { res.statusCode = 404; throw new Error('Target not found') }
        res.json({ success: true, message: 'Target deleted' })
    } catch (err) { next(err) }
}
