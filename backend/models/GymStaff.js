// GymStaff model — Batch 10 (guide feedback #6)
//
// Real-life employees of the gym (helpdesk, trainer, cleaner) with HR-style
// fields. This is intentionally separate from the existing `Staff` model
// which is used internally for the permissions/access-control UI in
// /admin/permissions. Don't confuse the two.
//
// Trainer-customer linking lives in the Customer model via `assignedTrainer`
// which references this collection.

const mongoose = require('mongoose')

const STAFF_TYPES = ['Helpdesk', 'Trainer', 'Cleaner']

const gymStaffSchema = new mongoose.Schema({
    // Type of staff member — drives UI conditional fields (e.g. trainer-only)
    staffType: {
        type: String,
        enum: STAFF_TYPES,
        required: [true, 'Staff type is required'],
    },

    // Basic info
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: { type: String, required: [true, 'Email is required'], lowercase: true, trim: true },
    phone: { type: String, required: [true, 'Phone is required'], trim: true },
    alternatePhone: { type: String, trim: true, default: '' },

    // Personal
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''], default: '' },
    maritalStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed', ''], default: '' },
    dateOfBirth: { type: Date },
    anniversary: { type: Date },

    // Identity / compliance
    healthInsurance: { type: Boolean, default: false },
    healthInsuranceNote: { type: String, trim: true, default: '' }, // policy number / remark
    healthInsuranceDocUrl: { type: String, trim: true, default: '' }, // server-relative path, e.g. /uploads/staff-documents/<uuid>.pdf
    aadhaarOnFile: { type: Boolean, default: false },
    aadhaarLast4: { type: String, trim: true, maxlength: 4, default: '' },
    panNumber: { type: String, trim: true, uppercase: true, default: '' },

    // Compensation
    monthlySalary: { type: Number, default: 0, min: 0 },

    // ─── Trainer-specific ───
    achievements: { type: String, trim: true, default: '' },
    isPersonalTrainer: { type: Boolean, default: false },
    personalTrainerSalary: { type: Number, default: 0, min: 0 },

    // Status
    isActive: { type: Boolean, default: true },

    // Multi-tenancy
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
}, { timestamps: true })

// Unique email per gym (allows same email across companies)
gymStaffSchema.index({ email: 1, gymId: 1 }, { unique: true })

module.exports = mongoose.model('GymStaff', gymStaffSchema)
