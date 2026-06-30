// backend/scripts/backfillInvoiceNumbers.js — Batch 13 (guide feedback #9a)
//
// One-shot migration. Re-numbers every existing Payment in the database
// with the new short format INV-YYYY-NNNN, sequential per company per
// year, ordered by paymentDate ascending so the earliest payment of a
// given year gets number 0001.
//
// Run with:
//     node backend/scripts/backfillInvoiceNumbers.js
//
// Idempotent: safe to re-run. After completion, all existing payments will
// have short numbers AND the Counter collection will be primed so the next
// new payment continues from the right number.
//
// Note: this rewrites invoiceNumber on payments that already had old long
// numbers (INV-2026-1729...). Customers won't have those receipts saved
// anywhere durable, so re-numbering is safe in this codebase's lifecycle.
// In a production system you'd typically only assign a number once.

require('dotenv').config()
const mongoose = require('mongoose')
const Payment  = require('../models/Payment')
const Counter  = require('../models/Counter')

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI

const main = async () => {
    if (!MONGO_URI) {
        console.error('❌ MONGO_URI not set in .env')
        process.exit(1)
    }
    await mongoose.connect(MONGO_URI)
    console.log('✓ Connected to MongoDB')

    // Pull every payment, oldest first, so seq numbers reflect chronology.
    const payments = await Payment.find({}).sort({ paymentDate: 1, createdAt: 1 })
    console.log(`Found ${payments.length} payments to renumber`)

    // Group by (companyId, year) to know each (group)'s final seq value.
    const seqByKey = new Map()  // key -> running seq

    let updated = 0
    for (const p of payments) {
        const year = new Date(p.paymentDate || p.createdAt).getFullYear()
        const key  = `invoice:${p.companyId}:${year}`
        const seq  = (seqByKey.get(key) || 0) + 1
        seqByKey.set(key, seq)

        const newNumber = `INV-${year}-${String(seq).padStart(4, '0')}`
        if (p.invoiceNumber === newNumber) continue   // already correct

        // Use updateOne directly to bypass the pre-save hook (which would
        // otherwise NOT regenerate, since invoiceNumber is set).
        await Payment.updateOne({ _id: p._id }, { $set: { invoiceNumber: newNumber } })
        updated++
    }

    // Prime the Counter collection so future payments continue correctly.
    for (const [key, seq] of seqByKey.entries()) {
        await Counter.findOneAndUpdate(
            { _id: key },
            { $set: { seq } },
            { upsert: true },
        )
    }

    console.log(`✓ Renumbered ${updated} payment(s)`)
    console.log(`✓ Primed ${seqByKey.size} counter(s)`)
    await mongoose.disconnect()
    console.log('✓ Done')
}

main().catch((err) => {
    console.error('❌ Backfill failed:', err)
    process.exit(1)
})
