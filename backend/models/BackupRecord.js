const mongoose = require('mongoose')

const backupSchema = new mongoose.Schema({
    filename:  { type: String, required: true },
    sizeBytes: { type: Number, default: 0 },
    counts: {
        customers:     { type: Number, default: 0 },
        subscriptions: { type: Number, default: 0 },
        payments:      { type: Number, default: 0 },
        attendance:    { type: Number, default: 0 },
        expenses:      { type: Number, default: 0 },
        enquiries:     { type: Number, default: 0 },
        memberships:   { type: Number, default: 0 },
        tasks:         { type: Number, default: 0 },
        targets:       { type: Number, default: 0 },
    },

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
    },
}, { timestamps: true })

module.exports = mongoose.model('Backup', backupSchema)
