const mongoose = require('mongoose')

const promotionLogSchema = new mongoose.Schema({
    subject: { type: String, required: true },
    body:    { type: String, required: true },
    recipients: [{
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
        email:      { type: String },
        name:       { type: String },
        status:     { type: String, enum: ['sent', 'failed'], default: 'sent' },
    }],
    sentCount:   { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
    },
}, { timestamps: true })

module.exports = mongoose.model('PromotionLog', promotionLogSchema)
