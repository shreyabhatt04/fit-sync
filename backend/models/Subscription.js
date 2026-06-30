const mongoose = require('mongoose')

const subscriptionSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
        index: true,
    },
    membership: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Membership',
        required: true,
    },
    startDate: { type: Date, required: true },
    endDate:   { type: Date, required: true },
    amount:    { type: Number, required: true, min: 0 },
    status: {
        type: String,
        enum: ['active', 'expired', 'cancelled', 'pending'],
        default: 'active',
    },
    notes: { type: String, default: '' },

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
    },

    // Used by the renewal reminder cron to avoid sending duplicates.
    // Tiers correspond to days-out thresholds for membership-expiry alerts
    // per guide feedback #5 (15, 7, 1 days before endDate).
    remindersSent: {
        fifteenDay: { type: Boolean, default: false },
        sevenDay:   { type: Boolean, default: false },
        oneDay:     { type: Boolean, default: false },
    },
}, { timestamps: true })

// Auto-expire when end date passes
subscriptionSchema.pre('save', function (next) {
    if (this.endDate < new Date() && this.status === 'active') {
        this.status = 'expired'
    }
    next()
})

subscriptionSchema.index({ companyId: 1, status: 1 })
subscriptionSchema.index({ companyId: 1, endDate: 1 })

module.exports = mongoose.model('Subscription', subscriptionSchema)
