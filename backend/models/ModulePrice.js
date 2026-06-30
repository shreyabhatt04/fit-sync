const mongoose = require('mongoose')

// Global module catalog — this is the SaaS pricing sheet, not per-company
const MODULE_NAMES = [
    'members', 'attendance', 'payments', 'memberships',
    'reports', 'tasks', 'targets', 'promotions', 'staff',
]

const modulePriceSchema = new mongoose.Schema(
    {
        module: {
            type: String,
            enum: MODULE_NAMES,
            required: true,
            unique: true,
        },
        label:       { type: String, required: true },
        description: { type: String, default: '' },

        // Prices in INR (rupees)
        pricing: {
            monthly:   { type: Number, default: 199 },
            quarterly: { type: Number, default: 499 },
            yearly:    { type: Number, default: 1499 },
        },

        isActive:  { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
        icon:      { type: String, default: '' },
    },
    { timestamps: true }
)

// Seed defaults — call this once at startup
modulePriceSchema.statics.seedDefaults = async function () {
    const defaults = [
        { module: 'members',     label: 'Member Management',    description: 'Add, manage and track all gym members',         pricing: { monthly: 199, quarterly: 499, yearly: 1499 }, sortOrder: 1, icon: 'FaUsers' },
        { module: 'attendance',  label: 'Attendance Tracking',  description: 'Daily attendance with calendar view',           pricing: { monthly: 149, quarterly: 399, yearly: 999  }, sortOrder: 2, icon: 'FaCalendarCheck' },
        { module: 'payments',    label: 'Payment Tracking',     description: 'Collect fees, invoices, due payment alerts',    pricing: { monthly: 149, quarterly: 399, yearly: 999  }, sortOrder: 3, icon: 'FaCreditCard' },
        { module: 'memberships', label: 'Membership Plans',     description: 'Create and manage flexible membership plans',   pricing: { monthly:  99, quarterly: 249, yearly: 699  }, sortOrder: 4, icon: 'FaLayerGroup' },
        { module: 'reports',     label: 'Business Reports',     description: 'Financial, client and subscription reports',    pricing: { monthly: 199, quarterly: 499, yearly: 1499 }, sortOrder: 5, icon: 'FaChartBar' },
        { module: 'tasks',       label: 'Task Manager',         description: 'Kanban board for gym tasks and to-dos',         pricing: { monthly:  99, quarterly: 249, yearly: 699  }, sortOrder: 6, icon: 'FaTasks' },
        { module: 'targets',     label: 'Targets & Goals',      description: 'Set revenue and member targets with progress',  pricing: { monthly:  99, quarterly: 249, yearly: 699  }, sortOrder: 7, icon: 'FaBullseye' },
        { module: 'promotions',  label: 'Email Promotions',     description: 'Send promotional emails to members',            pricing: { monthly: 149, quarterly: 399, yearly: 999  }, sortOrder: 8, icon: 'FaEnvelope' },
        { module: 'staff',       label: 'Staff Management',     description: 'Manage gym staff accounts and permissions',     pricing: { monthly: 149, quarterly: 399, yearly: 999  }, sortOrder: 9, icon: 'FaUserTie' },
    ]
    for (const item of defaults) {
        await this.findOneAndUpdate(
            { module: item.module },
            item,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        )
    }
    console.log('[ModulePrice] Default prices seeded')
}

module.exports = mongoose.model('ModulePrice', modulePriceSchema)
