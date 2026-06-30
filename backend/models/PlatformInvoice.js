// backend/models/PlatformInvoice.js — Batch 17 (guide feedback #11b)
//
// Invoice from FitSync (the SaaS platform) TO a gym. This is distinct from
// the Payment model, which records gym→customer transactions.
//
// PlatformInvoice answers questions like:
//   - "How much did Gym A pay us last quarter?"
//   - "Which gyms are overdue on their platform subscription?"
//   - "What's our total platform revenue this year?"
//
// Numbering: PINV-YYYY-NNNN (P for "platform"), sequential per calendar
// year using the same Counter helper as customer invoices, but with a
// different key namespace so the sequences don't collide.

const mongoose = require('mongoose')
const { nextSeq } = require('./Counter')

const lineItemSchema = new mongoose.Schema({
    module:    { type: String, required: true },     // e.g. 'reports', 'staff'
    label:     { type: String, required: true },     // human-readable name
    period:    { type: String, default: 'monthly' }, // monthly|quarterly|yearly
    amount:    { type: Number, required: true, min: 0 },
}, { _id: false })

const platformInvoiceSchema = new mongoose.Schema({
    invoiceNumber: { type: String, unique: true, sparse: true },

    // Which gym is being billed
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
    },

    // Period this invoice covers — used for grouping/reports.
    // For a monthly invoice these would be the first and last day of the month.
    billingPeriodStart: { type: Date, required: true },
    billingPeriodEnd:   { type: Date, required: true },

    // What the gym is being charged for
    lineItems: {
        type: [lineItemSchema],
        validate: [arr => arr.length > 0, 'At least one line item is required'],
    },

    subtotal: { type: Number, required: true, min: 0 },
    gst:      { type: Number, default: 0, min: 0 },     // 18% on platform services
    total:    { type: Number, required: true, min: 0 },

    status: {
        type: String,
        enum: ['paid', 'due', 'overdue', 'cancelled'],
        default: 'due',
        index: true,
    },

    issuedAt: { type: Date, default: Date.now, required: true },
    dueDate:  { type: Date, required: true },
    paidAt:   { type: Date, default: null },

    paymentMode: {
        type: String,
        enum: ['Bank Transfer', 'UPI', 'Card', 'Cash', 'Other', null],
        default: null,
    },

    notes: { type: String, default: '' },
}, { timestamps: true })

// Auto-number on first save. Format: PINV-YYYY-NNNN, sequential per year
// across the whole platform (one global sequence, not per-gym — these are
// platform-issued invoices).
platformInvoiceSchema.pre('save', async function (next) {
    if (this.invoiceNumber) return next()
    try {
        const year = new Date(this.issuedAt || Date.now()).getFullYear()
        const seq  = await nextSeq(`platform-invoice:${year}`)
        this.invoiceNumber = `PINV-${year}-${String(seq).padStart(4, '0')}`
        next()
    } catch (err) { next(err) }
})

// Useful compound indexes
platformInvoiceSchema.index({ companyId: 1, issuedAt: -1 })
platformInvoiceSchema.index({ status: 1, dueDate: 1 })

module.exports = mongoose.model('PlatformInvoice', platformInvoiceSchema)
