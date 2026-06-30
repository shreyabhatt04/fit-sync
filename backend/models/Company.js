const mongoose = require('mongoose')

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },

    // URL-safe unique identifier — e.g. "powerhouse-gym"
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    },

    // Owner / primary admin
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Contact info
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },

    // Gym info (new — Batch 9b)
    established: { type: String, trim: true },   // e.g. "2020" — kept as string for simplicity
    website: { type: String, trim: true },
    description: { type: String, trim: true, maxlength: [500, 'Description cannot exceed 500 characters'] },
    gstNumber: { type: String, trim: true, uppercase: true },

    // Owner information (separate from the Company's admin User — this is
    // the real-world owner's personal details, useful for legal/tax records
    // and for contact when admin user differs from owner).
    owner: {
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      alternatePhone: { type: String, trim: true },
      dateOfBirth: { type: Date },
      aadhaarLast4: { type: String, trim: true, maxlength: 4 },  // only last 4 for privacy
      panNumber: { type: String, trim: true, uppercase: true },
      address: { type: String, trim: true },
    },

    // Payment / bank info — used to display bank details on invoices and
    // generate the UPI QR code for customers to scan and pay.
    // upiId is the only field strictly required for the QR; the rest are
    // shown on invoices and customer-facing payment screens.
    bankDetails: {
      bankName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      ifsc: { type: String, trim: true, uppercase: true },
      accountHolderName: { type: String, trim: true },
      upiId: { type: String, trim: true, lowercase: true },  // e.g. "powerhouse@okhdfcbank"
    },

    // Logo (Cloudinary URL — we'll add upload later)
    logo: { type: String, default: null },

    // Plan: trial | basic | pro | enterprise
    plan: {
      type: String,
      enum: ['trial', 'basic', 'pro', 'enterprise'],
      default: 'trial',
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'suspended', 'trial', 'expired'],
      default: 'trial',
    },

    // Trial expiry (14 days from creation by default)
    trialEndsAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },

    // Which modules are active for this company
    // Each key is a module name, value is true/false
    modules: {
      members: { type: Boolean, default: true },
      attendance: { type: Boolean, default: true },
      payments: { type: Boolean, default: true },
      memberships: { type: Boolean, default: true },
      reports: { type: Boolean, default: false },
      tasks: { type: Boolean, default: false },
      targets: { type: Boolean, default: false },
      promotions: { type: Boolean, default: false },
      staff: { type: Boolean, default: false },
    },

    // Max members allowed under current plan
    maxMembers: { type: Number, default: 50 },

    // Max staff accounts allowed
    maxStaff: { type: Number, default: 3 },

    // Settings (gym-specific preferences)
    settings: {
      timezone: { type: String, default: 'Asia/Kolkata' },
      currency: { type: String, default: 'INR' },
      dateFormat: { type: String, default: 'DD/MM/YYYY' },
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: false,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
)

// Auto-generate slug from name if not provided
companySchema.pre('validate', function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50)
  }
  next()
})

// Virtual: is the company currently on trial?
companySchema.virtual('isOnTrial').get(function () {
  return this.status === 'trial' && this.trialEndsAt > new Date()
})

// Virtual: is trial expired?
companySchema.virtual('isTrialExpired').get(function () {
  return this.status === 'trial' && this.trialEndsAt <= new Date()
})

module.exports = mongoose.model('Company', companySchema)
