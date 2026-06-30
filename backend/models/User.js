const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

// SHA-256 helper used for OTP hashing. We don't bcrypt the OTP because
// it's only valid for 10 minutes — the cost of bcrypt isn't justified
// for short-lived secrets. SHA-256 with the OTP space (10⁶) is more
// than adequate against an attacker who somehow gets a DB read but
// doesn't know the email of the target user.
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex')

// True if `s` looks like a SHA-256 hex digest already (64 lowercase hex
// chars). Used by the emailOtp setter so loading a hashed value from
// the DB doesn't double-hash it.
const looksHashed = (s) => typeof s === 'string' && /^[a-f0-9]{64}$/.test(s)

const userSchema = new mongoose.Schema(
    {
        // Which company this user belongs to.
        // null only for superadmin (who manages all companies).
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            default: null,
            index: true,
        },

        firstName: { type: String, required: [true, 'First name is required'], trim: true },
        lastName:  { type: String, required: [true, 'Last name is required'],  trim: true },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        phone:    { type: String, trim: true, default: '' },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: 6,
            select: false,
        },

        role: {
            type: String,
            enum: ['superadmin', 'admin', 'staff', 'customer'],
            default: 'customer',
        },

        avatar:      { type: String, default: null },
        gender:      { type: String, enum: ['male', 'female', 'other', ''], default: '' },
        dateOfBirth: { type: Date, default: null },
        address:     { type: String, trim: true, default: '' },

        isActive: { type: Boolean, default: true },

        verificationStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'approved',
        },

        // Email verification (OTP).
        // The OTP is stored as a SHA-256 hash, never plaintext (Batch 23,
        // matching the password-reset-token treatment). The setter hashes
        // any value that doesn't already look like a 64-char hex digest,
        // so callers can do `user.emailOtp = '123456'` and the field will
        // be hashed transparently.
        isEmailVerified: { type: Boolean, default: false },
        emailOtp: {
            type: String,
            default: null,
            select: false,
            set: (v) => {
                if (v === null || v === undefined || v === '') return null
                if (looksHashed(v)) return v   // loading from DB — don't re-hash
                return sha256(v)
            },
        },
        emailOtpExpiry:  { type: Date,   default: null, select: false },

        // Password reset
        passwordResetToken:  { type: String, default: null, select: false },
        passwordResetExpiry: { type: Date,   default: null, select: false },

        preferences: {
            notifications: { type: Boolean, default: true },
            theme:         { type: String,  default: 'light' },
        },

        // For staff: which branch they work at
        branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },

        // Staff permissions (which modules they can access)
        permissions: { type: [String], default: [] },

        invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    {
        timestamps: true,
        toJSON:   { virtuals: true },
        toObject: { virtuals: true },
    }
)

// Virtuals for full name (both "fullName" and "name" so old code works)
userSchema.virtual('fullName').get(function () {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim()
})
userSchema.virtual('name').get(function () {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim()
})

// Hash password before save
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next()
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
})

// Compare plain password against hashed one
userSchema.methods.comparePassword = async function (candidate) {
    return bcrypt.compare(candidate, this.password)
}
// Alias for legacy code
userSchema.methods.matchPassword = userSchema.methods.comparePassword

// Verify an OTP candidate against the stored hash + expiry.
// Returns true only if all of: a hash is present, expiry is in the future,
// and the SHA-256 of the candidate matches what's stored.
//
// Caller must have loaded the user with .select('+emailOtp +emailOtpExpiry')
// or these fields will be undefined.
userSchema.methods.verifyEmailOtp = function (candidate) {
    if (!candidate) return false
    if (!this.emailOtp) return false
    if (!this.emailOtpExpiry || this.emailOtpExpiry < new Date()) return false
    const candidateHash = sha256(candidate)
    return candidateHash === this.emailOtp
}

userSchema.index({ companyId: 1, role: 1 })

module.exports = mongoose.model('User', userSchema)
