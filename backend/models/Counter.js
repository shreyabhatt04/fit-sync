// backend/models/Counter.js — Batch 13 (guide feedback #9a)
//
// Generic atomic-increment counter, used to generate sequential invoice
// numbers per company per year (e.g. INV-2026-0001, 0002, 0003 ...).
//
// Pattern: each unique sequence is identified by a string _id like
// "invoice:<companyId>:<year>". Reading + incrementing is done in a single
// findOneAndUpdate with $inc + upsert, which Mongo guarantees is atomic.
// No transaction needed — even if two payments are saved at the exact same
// millisecond, each gets a distinct seq value.
//
// Usage:
//   const { nextSeq } = require('./Counter')
//   const n = await nextSeq(`invoice:${companyId}:${year}`)

const mongoose = require('mongoose')

const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },   // e.g. "invoice:64ab...d:2026"
    seq: { type: Number, default: 0 },
}, { versionKey: false })

const Counter = mongoose.model('Counter', counterSchema)

// Atomically increment the named counter and return the new value.
// First call for a given key returns 1 (because $inc applies to the
// upserted doc with default 0, then returns the post-increment value).
const nextSeq = async (key) => {
    const doc = await Counter.findOneAndUpdate(
        { _id: key },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
    )
    return doc.seq
}

module.exports = Counter
module.exports.nextSeq = nextSeq
