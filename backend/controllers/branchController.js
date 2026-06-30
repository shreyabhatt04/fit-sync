const Branch   = require('../models/Branch')
const Customer = require('../models/Customer')

// GET /api/branches
exports.getBranches = async (req, res, next) => {
    try {
        const branches = await Branch.find({ companyId: req.companyId }).sort({ createdAt: 1 })

        // Attach member count to the main branch for now
        const totalMembers = await Customer.countDocuments({ companyId: req.companyId })
        const withCounts = branches.map((b, i) => ({
            ...b.toObject(),
            memberCount: b.isMain ? totalMembers : 0,
        }))

        res.json({ success: true, data: withCounts })
    } catch (err) { next(err) }
}

// POST /api/branches
exports.createBranch = async (req, res, next) => {
    try {
        const { name, address, phone, manager } = req.body
        if (!name) {
            res.statusCode = 400
            throw new Error('Branch name is required')
        }

        // First branch for this company becomes the main one
        const existing = await Branch.countDocuments({ companyId: req.companyId })

        const branch = await Branch.create({
            name, address, phone, manager,
            isMain: existing === 0,
            companyId: req.companyId,
        })

        res.status(201).json({ success: true, data: branch, message: 'Branch created' })
    } catch (err) { next(err) }
}

// PUT /api/branches/:id
exports.updateBranch = async (req, res, next) => {
    try {
        const { name, address, phone, manager } = req.body
        const branch = await Branch.findOneAndUpdate(
            { _id: req.params.id, companyId: req.companyId },
            { name, address, phone, manager },
            { new: true, runValidators: true }
        )
        if (!branch) { res.statusCode = 404; throw new Error('Branch not found') }
        res.json({ success: true, data: branch, message: 'Branch updated' })
    } catch (err) { next(err) }
}

// DELETE /api/branches/:id
exports.deleteBranch = async (req, res, next) => {
    try {
        const branch = await Branch.findOne({ _id: req.params.id, companyId: req.companyId })
        if (!branch) { res.statusCode = 404; throw new Error('Branch not found') }

        const total = await Branch.countDocuments({ companyId: req.companyId })
        if (total <= 1) {
            res.statusCode = 400
            throw new Error('You must have at least one branch')
        }
        if (branch.isMain) {
            res.statusCode = 400
            throw new Error('Cannot delete the main branch. Set another as main first.')
        }

        await branch.deleteOne()
        res.json({ success: true, message: 'Branch deleted' })
    } catch (err) { next(err) }
}

// PUT /api/branches/:id/set-main
exports.setMainBranch = async (req, res, next) => {
    try {
        await Branch.updateMany({ companyId: req.companyId }, { isMain: false })
        const branch = await Branch.findOneAndUpdate(
            { _id: req.params.id, companyId: req.companyId },
            { isMain: true },
            { new: true }
        )
        if (!branch) { res.statusCode = 404; throw new Error('Branch not found') }
        res.json({ success: true, data: branch, message: 'Main branch updated' })
    } catch (err) { next(err) }
}
