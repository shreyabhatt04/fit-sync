const nodemailer   = require('nodemailer')
const Customer     = require('../models/Customer')
const PromotionLog = require('../models/PromotionLog')

const createTransporter = () => nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
})

const textToHtml = (text, recipientName, gymName) => {
    const personalized = text.replace(/\{name\}/gi, recipientName).replace(/\{gym\}/gi, gymName)
    const lines = personalized.split('\n')
        .map(line => `<p style="margin:0 0 8px">${line || '&nbsp;'}</p>`)
        .join('')
    return `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1e293b">
            <div style="background:#2563eb;padding:16px 24px;border-radius:8px 8px 0 0">
                <h2 style="color:#fff;margin:0;font-size:18px">${gymName}</h2>
            </div>
            <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
                ${lines}
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
                <p style="font-size:12px;color:#94a3b8;margin:0">
                    Sent via FitSync gym management.
                </p>
            </div>
        </div>
    `
}

// POST /api/promotions/send
exports.sendPromotion = async (req, res, next) => {
    try {
        const { customerIds, subject, body } = req.body

        if (!customerIds?.length) { res.statusCode = 400; throw new Error('Select at least one recipient') }
        if (!subject?.trim())     { res.statusCode = 400; throw new Error('Email subject is required') }
        if (!body?.trim())        { res.statusCode = 400; throw new Error('Email body is required') }

        const customers = await Customer.find({
            _id: { $in: customerIds },
            companyId: req.companyId,
        }).select('firstName lastName email')

        if (!customers.length) {
            res.statusCode = 400
            throw new Error('No valid recipients found in this gym')
        }

        const gymName = req.company.name
        const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS

        const transporter = smtpConfigured ? createTransporter() : null
        const recipients = []
        let sentCount = 0
        let failedCount = 0

        for (const customer of customers) {
            const firstName = customer.firstName || 'Member'
            const name      = `${customer.firstName} ${customer.lastName}`
            const html      = textToHtml(body, firstName, gymName)

            if (!smtpConfigured || !customer.email) {
                // SMTP not set up — log as failed but continue
                recipients.push({ customerId: customer._id, email: customer.email, name, status: 'failed' })
                failedCount++
                continue
            }

            try {
                await transporter.sendMail({
                    from: `"${gymName}" <${process.env.SMTP_USER}>`,
                    to: customer.email,
                    subject,
                    html,
                })
                recipients.push({ customerId: customer._id, email: customer.email, name, status: 'sent' })
                sentCount++
            } catch (emailErr) {
                console.error(`[promotion] Send to ${customer.email} failed:`, emailErr.message)
                recipients.push({ customerId: customer._id, email: customer.email, name, status: 'failed' })
                failedCount++
            }
        }

        await PromotionLog.create({
            subject, body, recipients, sentCount, failedCount,
            companyId: req.companyId,
        })

        res.json({
            success: true,
            message: `Sent to ${sentCount} member${sentCount !== 1 ? 's' : ''}${failedCount ? `, ${failedCount} failed` : ''}`,
            data: { sentCount, failedCount, total: customers.length },
        })
    } catch (err) { next(err) }
}

// GET /api/promotions/history
exports.getPromotionHistory = async (req, res, next) => {
    try {
        const logs = await PromotionLog.find({ companyId: req.companyId })
            .sort({ createdAt: -1 })
            .limit(50)
            .select('subject sentCount failedCount createdAt recipients')
        res.json({ success: true, data: logs })
    } catch (err) { next(err) }
}

// POST /api/promotions/mark-contacted
exports.markContacted = async (req, res, next) => {
    try {
        const { customerId } = req.body
        if (!customerId) { res.statusCode = 400; throw new Error('customerId is required') }

        const customer = await Customer.findOne({ _id: customerId, companyId: req.companyId })
            .select('firstName lastName email')
        if (!customer) { res.statusCode = 404; throw new Error('Customer not found') }

        await PromotionLog.create({
            subject: 'Manual Contact',
            body:    'Contacted manually (phone/in-person)',
            recipients: [{
                customerId: customer._id,
                email:      customer.email,
                name:       `${customer.firstName} ${customer.lastName}`,
                status:     'sent',
            }],
            sentCount: 1,
            failedCount: 0,
            companyId: req.companyId,
        })

        res.json({ success: true, message: 'Marked as contacted' })
    } catch (err) { next(err) }
}

// GET /api/promotions/last-contacted
exports.getLastContacted = async (req, res, next) => {
    try {
        const logs = await PromotionLog.aggregate([
            { $match: { companyId: req.companyId } },
            { $unwind: '$recipients' },
            { $match: { 'recipients.status': 'sent' } },
            { $group: { _id: '$recipients.customerId', lastContacted: { $max: '$createdAt' } } },
        ])

        const map = {}
        logs.forEach(l => { if (l._id) map[l._id.toString()] = l.lastContacted })

        res.json({ success: true, data: map })
    } catch (err) { next(err) }
}
