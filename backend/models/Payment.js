const mongoose = require('mongoose')
const { nextSeq } = require('./Counter')

const paymentSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
    amount:      { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, default: Date.now },
    dueDate:     { type: Date },
    mode: {
        type: String,
        enum: ['Cash', 'Card', 'Online', 'UPI', 'Bank Transfer'],
        default: 'Cash',
    },
    status: { type: String, enum: ['paid', 'due', 'overdue'], default: 'paid' },
    invoiceNumber: { type: String },
    notes: { type: String, default: '' },

    // ─── GST fields (optional) — Batch 15, guide feedback #9c ───
    // For Indian gym services the canonical rate is 18% (9% CGST + 9% SGST
    // for intra-state, or 18% IGST for inter-state). Default rate is 0 so
    // existing records before this batch behave as "non-GST" until updated.
    // The taxable amount + tax components don't have to add up to `amount`
    // for old records — when they're all 0/zero, reports treat the row as
    // non-GST and either skip it or apply a preview rate (frontend-only).
    gstRate:        { type: Number, default: 0, min: 0, max: 28 },   // 0, 5, 12, 18, 28
    taxableAmount:  { type: Number, default: 0, min: 0 },             // amount excluding tax
    cgst:           { type: Number, default: 0, min: 0 },
    sgst:           { type: Number, default: 0, min: 0 },
    igst:           { type: Number, default: 0, min: 0 },

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
    },
}, { timestamps: true })

// Generate a short, human-friendly invoice number on first save.
// Format: INV-<YYYY>-<NNNN>, e.g. INV-2026-0001, sequential per company per
// year. Per guide feedback #9a: "Use smaller invoice numbers".
//
// Atomicity: nextSeq() uses findOneAndUpdate with $inc, so two payments
// saved at the same instant get distinct numbers. The compound unique
// index below is a backstop in case a counter doc ever gets dropped or
// reset (very unlikely) — if it triggers, we retry once with the next seq.
paymentSchema.pre('save', async function (next) {
    if (this.invoiceNumber) return next()
    try {
        const year = new Date(this.paymentDate || Date.now()).getFullYear()
        const key  = `invoice:${this.companyId}:${year}`
        const Model = this.constructor
        for (let attempt = 0; attempt < 5; attempt++) {
            const seq = await nextSeq(key)
            const candidate = `INV-${year}-${String(seq).padStart(4, '0')}`
            // Belt-and-suspenders dupe check (handles the rare case of a
            // counter doc being out of sync with already-issued invoices,
            // e.g. after a partial DB restore).
            const exists = await Model.findOne({ companyId: this.companyId, invoiceNumber: candidate })
            if (!exists) {
                this.invoiceNumber = candidate
                return next()
            }
        }
        // Fallback: last-ditch unique value derived from _id. Shouldn't
        // happen in practice but prevents a save failure if the counter
        // is somehow stuck behind reality.
        this.invoiceNumber = `INV-${year}-${this._id.toString().slice(-6).toUpperCase()}`
        next()
    } catch (err) {
        next(err)
    }
})

paymentSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true, sparse: true })
paymentSchema.index({ companyId: 1, status: 1 })
paymentSchema.index({ companyId: 1, paymentDate: -1 })

module.exports = mongoose.model('Payment', paymentSchema)
