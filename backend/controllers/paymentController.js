const Payment  = require('../models/Payment')
const Customer = require('../models/Customer')
const Company  = require('../models/Company')
const { createInvoicePdfStream } = require('../utils/invoicePdf')

const findCustomerRecord = async (user) => {
    if (!user?.companyId || !user?.email) return null
    return Customer.findOne({ companyId: user.companyId, email: user.email })
}

// GET /api/payments
exports.getPayments = async (req, res, next) => {
    try {
        const { status, mode, customer, page = 1, limit = 10 } = req.query
        const query = { companyId: req.companyId }

        if (req.user.role === 'customer') {
            const rec = await findCustomerRecord(req.user)
            if (!rec) return res.json({ success: true, data: [], pagination: { total: 0, page: 1, pages: 0 } })
            query.customer = rec._id
        } else if (customer) {
            query.customer = customer
        }

        if (status) query.status = status
        if (mode)   query.mode   = mode

        const total = await Payment.countDocuments(query)
        const payments = await Payment.find(query)
            .populate('customer', 'firstName lastName email phone')
            .populate({ path: 'subscription', populate: { path: 'membership', select: 'name' } })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort({ paymentDate: -1 })

        res.json({
            success: true,
            data: payments,
            pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
        })
    } catch (err) { next(err) }
}

// POST /api/payments
exports.createPayment = async (req, res, next) => {
    try {
        // Verify customer is in this company
        const targetCustomer = await Customer.findOne({
            _id: req.body.customer,
            companyId: req.companyId,
        })
        if (!targetCustomer) {
            res.statusCode = 400
            throw new Error('Customer not found in this company')
        }

        const payment = await Payment.create({ ...req.body, companyId: req.companyId })
        const populated = await payment.populate('customer', 'firstName lastName')
        res.status(201).json({ success: true, data: populated, message: 'Payment recorded' })
    } catch (err) { next(err) }
}

// GET /api/payments/due
exports.getDuePayments = async (req, res, next) => {
    try {
        const due = await Payment.find({
            companyId: req.companyId,
            status: { $in: ['due', 'overdue'] },
        })
            .populate('customer', 'firstName lastName phone')
            .sort({ dueDate: 1 })
        res.json({ success: true, data: due })
    } catch (err) { next(err) }
}

// GET /api/payments/stats
exports.getPaymentStats = async (req, res, next) => {
    try {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const companyId = req.companyId

        const [totalCollected, thisMonth, totalDue] = await Promise.all([
            Payment.aggregate([
                { $match: { companyId, status: 'paid' } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Payment.aggregate([
                { $match: { companyId, status: 'paid', paymentDate: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Payment.aggregate([
                { $match: { companyId, status: { $in: ['due', 'overdue'] } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
        ])

        res.json({
            success: true,
            data: {
                totalCollected: totalCollected[0]?.total || 0,
                thisMonth:      thisMonth[0]?.total || 0,
                totalDue:       totalDue[0]?.total || 0,
            },
        })
    } catch (err) { next(err) }
}

// PUT /api/payments/:id
exports.updatePayment = async (req, res, next) => {
    try {
        const { companyId, ...safe } = req.body
        const payment = await Payment.findOneAndUpdate(
            { _id: req.params.id, companyId: req.companyId },
            safe,
            { new: true, runValidators: true }
        ).populate('customer', 'firstName lastName')

        if (!payment) { res.statusCode = 404; throw new Error('Payment not found') }
        res.json({ success: true, data: payment, message: 'Payment updated' })
    } catch (err) { next(err) }
}

// DELETE /api/payments/:id
exports.deletePayment = async (req, res, next) => {
    try {
        const payment = await Payment.findOneAndDelete({ _id: req.params.id, companyId: req.companyId })
        if (!payment) { res.statusCode = 404; throw new Error('Payment not found') }
        res.json({ success: true, message: 'Payment deleted' })
    } catch (err) { next(err) }
}

// GET /api/payments/:id/pdf?copy=customer|owner
// Streams a PDF invoice for the given payment. Two copy variants are
// supported per guide feedback #9b: 'customer' (clean, default) and
// 'owner' (adds internal notes + signature lines).
//
// Scoping: admins/staff see any payment in their company. Customers can
// ONLY download their own invoices — the same row-level scoping the
// list endpoint uses. Customers cannot request the 'owner' copy.
exports.getInvoicePdf = async (req, res, next) => {
    try {
        // Validate / normalize copy param
        let copy = (req.query.copy || 'customer').toLowerCase()
        if (!['customer', 'owner'].includes(copy)) copy = 'customer'
        // Customers can only ever see their own customer copy.
        if (req.user.role === 'customer' && copy === 'owner') copy = 'customer'

        // Build the same scoping filter the list endpoint uses
        const query = { _id: req.params.id, companyId: req.companyId }
        if (req.user.role === 'customer') {
            const rec = await findCustomerRecord(req.user)
            if (!rec) { res.statusCode = 404; throw new Error('Invoice not found') }
            query.customer = rec._id
        }

        const payment = await Payment.findOne(query)
            .populate('customer', 'firstName lastName email phone address')

        if (!payment) { res.statusCode = 404; throw new Error('Invoice not found') }

        // Pull company info for the invoice header. We don't use req.company
        // here because that's a partial Mongoose-doc — fetching fresh is
        // cheap and ensures the latest gym name / GST / address.
        const company = await Company.findById(req.companyId)
            .select('name address city state phone email gstNumber bankDetails')

        const filename = `invoice-${payment.invoiceNumber || payment._id}-${copy}.pdf`
        res.setHeader('Content-Type', 'application/pdf')
        // Inline so browsers preview the PDF if the user clicked a link;
        // axios with responseType:'blob' will save it regardless.
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`)

        const stream = createInvoicePdfStream({
            payment,
            customer: payment.customer,
            company,
            copy,
        })
        stream.pipe(res)
        stream.on('error', (err) => next(err))
    } catch (err) { next(err) }
}
