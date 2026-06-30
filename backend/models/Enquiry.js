const mongoose = require('mongoose')

const enquirySchema = new mongoose.Schema({
    name:  { type: String, required: [true, 'Name is required'], trim: true },
    phone: { type: String, required: [true, 'Phone is required'], trim: true },
    email: { type: String, lowercase: true, trim: true, default: '' },
    source: {
        type: String,
        enum: ['Walk-in', 'Website', 'Referral', 'Call'],
        default: 'Walk-in',
    },
    interestedIn: { type: String, default: '' },
    status: {
        type: String,
        enum: ['new', 'follow-up', 'converted', 'lost'],
        default: 'new',
    },
    notes: { type: String, default: '' },

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
    },
}, { timestamps: true })

enquirySchema.index({ companyId: 1, status: 1 })

module.exports = mongoose.model('Enquiry', enquirySchema)
