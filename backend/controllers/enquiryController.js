const Enquiry = require('../models/Enquiry')

// GET /api/enquiries
exports.getEnquiries = async (req, res, next) => {
    try {
        const { status, source, search, page = 1, limit = 10 } = req.query
        const query = { companyId: req.companyId }

        if (status) query.status = status
        if (source) query.source = source
        if (search) {
            query.$or = [
                { name:  { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ]
        }

        const total = await Enquiry.countDocuments(query)
        const enquiries = await Enquiry.find(query)
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort({ createdAt: -1 })

        res.json({
            success: true,
            data: enquiries,
            pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
        })
    } catch (err) { next(err) }
}

// POST /api/enquiries
exports.createEnquiry = async (req, res, next) => {
    try {
        const enquiry = await Enquiry.create({ ...req.body, companyId: req.companyId })
        res.status(201).json({ success: true, data: enquiry, message: 'Enquiry added' })
    } catch (err) { next(err) }
}

// PUT /api/enquiries/:id
exports.updateEnquiry = async (req, res, next) => {
    try {
        const { companyId, ...safe } = req.body
        const enquiry = await Enquiry.findOneAndUpdate(
            { _id: req.params.id, companyId: req.companyId },
            safe,
            { new: true, runValidators: true }
        )
        if (!enquiry) { res.statusCode = 404; throw new Error('Enquiry not found') }
        res.json({ success: true, data: enquiry, message: 'Enquiry updated' })
    } catch (err) { next(err) }
}

// DELETE /api/enquiries/:id
exports.deleteEnquiry = async (req, res, next) => {
    try {
        const enquiry = await Enquiry.findOneAndDelete({ _id: req.params.id, companyId: req.companyId })
        if (!enquiry) { res.statusCode = 404; throw new Error('Enquiry not found') }
        res.json({ success: true, message: 'Enquiry deleted' })
    } catch (err) { next(err) }
}

// GET /api/enquiries/stats
exports.getEnquiryStats = async (req, res, next) => {
    try {
        const stats = await Enquiry.aggregate([
            { $match: { companyId: req.companyId } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        const result = { new: 0, 'follow-up': 0, converted: 0, lost: 0 }
        stats.forEach(s => { if (result[s._id] !== undefined) result[s._id] = s.count })
        res.json({ success: true, data: result })
    } catch (err) { next(err) }
}
