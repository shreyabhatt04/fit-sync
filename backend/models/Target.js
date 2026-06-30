const mongoose = require('mongoose')

const targetSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: ['Revenue', 'Members', 'Attendance', 'Renewals'],
        required: true,
    },
    target:  { type: Number, required: true },
    current: { type: Number, default: 0 },
    unit:    { type: String, default: '' },
    deadline:{ type: Date },

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
    },
}, { timestamps: true })

module.exports = mongoose.model('Target', targetSchema)
