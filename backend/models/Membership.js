const mongoose = require('mongoose')

const membershipSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'Plan name is required'], trim: true },
    duration: {
        type: String,
        required: [true, 'Duration is required'],
        enum: ['1 Month', '3 Months', '6 Months', '1 Year'],
    },
    price:       { type: Number, required: [true, 'Price is required'], min: 0 },
    description: { type: String, default: '' },
    features:    [{ type: String }],
    color:       { type: String, default: '#2563eb' },
    isActive:    { type: Boolean, default: true },

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
    },
}, { timestamps: true })

membershipSchema.index({ companyId: 1, isActive: 1 })

module.exports = mongoose.model('Membership', membershipSchema)
