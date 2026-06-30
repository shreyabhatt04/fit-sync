const mongoose = require('mongoose')

const MODULES = [
    'Dashboard', 'Customers', 'Attendance', 'Memberships',
    'Subscriptions', 'Payments', 'Reports', 'Enquiries',
    'Targets', 'Tasks', 'Promotions', 'Settings',
]

const staffSchema = new mongoose.Schema({
    name:  { type: String, required: [true, 'Name is required'], trim: true },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
    },
    phone: { type: String, trim: true, default: '' },
    role: {
        type: String,
        enum: ['super_admin', 'manager', 'trainer', 'staff'],
        default: 'staff',
    },
    permissions: {
        type: [String],
        enum: MODULES,
        default: ['Dashboard'],
    },
    isActive: { type: Boolean, default: true },

    // Optional link to a real User account (if this staff member can log in)
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
    },
}, { timestamps: true })

staffSchema.index({ companyId: 1, email: 1 }, { unique: true })

staffSchema.statics.MODULES = MODULES

module.exports = mongoose.model('Staff', staffSchema)
