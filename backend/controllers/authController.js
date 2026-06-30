const crypto  = require('crypto')
const jwt     = require('jsonwebtoken')
const mongoose = require('mongoose')
const User    = require('../models/User')
const Company = require('../models/Company')
const {
    sendOtpEmail,
    sendPasswordResetEmail,
    sendWelcomeEmail,
    sendInviteEmail,
} = require('../utils/email')

// ── Helpers ────────────────────────────────────────────────────
const generateToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d',
    })

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000))

// Whether the deployment has SMTP credentials configured. Used by the
// signup flow to decide whether to ask the user for an OTP. When email
// is not configured we skip OTP entirely (per guide feedback #8: "If
// not configured: System should still work using approval-based access
// control"). Both env vars must be set — half-configured = disabled.
const isEmailEnabled = () =>
    !!(process.env.EMAIL_USER && process.env.EMAIL_PASS)

// Turn a gym name into a URL-friendly slug
const slugify = (name) =>
    name.toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50)

// Build a user response payload — never includes the password
const buildUserResponse = (user, token) => ({
    _id:       user._id,
    firstName: user.firstName,
    lastName:  user.lastName,
    name:      `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    email:     user.email,
    phone:     user.phone,
    role:      user.role,
    companyId: user.companyId,
    isEmailVerified: user.isEmailVerified,
    token,
})

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/register
// Creates a Company + the admin User who owns it.
// Body: { firstName, lastName, email, phone, password, gymName }
// ─────────────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
    try {
        const { firstName, lastName, email, phone, password, gymName, name } = req.body

        // Accept either firstName/lastName or a single name field
        let fName = firstName
        let lName = lastName
        if (!fName && name) {
            const parts = String(name).trim().split(/\s+/)
            fName = parts[0]
            lName = parts.slice(1).join(' ') || ''
        }

        if (!fName || !email || !password || !gymName) {
            return res.status(400).json({
                success: false,
                message: 'First name, email, password, and gym name are required',
            })
        }

        if (String(password).length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters',
            })
        }

        const emailLower = email.toLowerCase().trim()

        // Reject if email already taken
        const existing = await User.findOne({ email: emailLower })
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered',
            })
        }

        // Generate a unique slug from the gym name
        let baseSlug = slugify(gymName) || 'gym'
        let slug = baseSlug
        let suffix = 1
        while (await Company.findOne({ slug })) {
            slug = `${baseSlug}-${suffix++}`
        }

        // Create company first — user references it
        const company = await Company.create({
            name:    gymName.trim(),
            slug,
            email:   emailLower,
            phone:   phone || '',
            status:  'trial',
            plan:    'trial',
        })

        // Create the admin user linked to the new company
        // OTP only matters when email is actually configured. When email
        // is disabled we don't bother generating one — the user has no way
        // to receive it. (Batch 22, guide feedback #8.)
        const emailOn = isEmailEnabled()
        const otp = emailOn ? generateOtp() : null
        const otpExpiry = emailOn ? new Date(Date.now() + 10 * 60 * 1000) : null

        let user
        try {
            user = await User.create({
                firstName:    fName,
                lastName:     lName || '',
                email:        emailLower,
                phone:        phone || '',
                password,
                role:         'admin',
                companyId:    company._id,
                isActive:     true,
                // When email is disabled, mark already-verified — there's no
                // way to verify ownership of an email when we can't send to
                // it, and the brief says the system should still work via
                // approval-based access control.
                isEmailVerified: !emailOn,
                emailOtp:     otp,
                emailOtpExpiry: otpExpiry,
                // Gym-admin signup is no longer auto-approved (Batch 21,
                // guide feedback #6). Superadmin must approve before login.
                verificationStatus: 'pending',
            })
        } catch (err) {
            // If user creation fails, clean up the orphaned company
            await Company.findByIdAndDelete(company._id).catch(() => {})
            throw err
        }

        // Link company.ownerId → user
        company.ownerId = user._id
        await company.save()

        // Fire emails (don't block the response if email is misconfigured)
        if (emailOn) {
            sendOtpEmail({ to: user.email, name: user.firstName, otp })
                .catch(e => console.error('[register] OTP email failed:', e.message))
            sendWelcomeEmail({ to: user.email, name: user.firstName, gymName: company.name })
                .catch(e => console.error('[register] Welcome email failed:', e.message))
        }

        // Do NOT issue a token here — pending users can't log in (Batch 21).
        // The frontend uses emailVerificationRequired to decide whether to
        // route the user to the OTP screen or straight to "awaiting approval".
        res.status(201).json({
            success: true,
            requiresApproval: true,
            emailVerificationRequired: emailOn,
            message: emailOn
                ? 'Account created. Please check your email for the verification code.'
                : 'Account created. A FitSync administrator will review your gym and notify you when access is granted.',
            data: {
                _id:    user._id,
                email:  user.email,
                gymName: company.name,
                verificationStatus: user.verificationStatus,
                isEmailVerified: user.isEmailVerified,
            },
        })
    } catch (err) {
        next(err)
    }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required',
            })
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password')
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' })
        }

        const isMatch = await user.comparePassword(password)
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' })
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                code: 'ACCOUNT_INACTIVE',
                message: 'Account deactivated. Contact support.',
            })
        }

        // Approval gate (Batch 21, guide feedback #6/#7).
        // Superadmins bypass approval — they're seeded directly. Existing
        // users default to 'approved' so this only affects new signups
        // and invited users who haven't been approved yet.
        if (user.role !== 'superadmin' && user.verificationStatus !== 'approved') {
            const messages = {
                pending:  'Your account is pending approval. You will be notified once approved.',
                rejected: 'Your account registration was not approved. Please contact support.',
            }
            return res.status(403).json({
                success: false,
                code: user.verificationStatus === 'rejected' ? 'ACCOUNT_REJECTED' : 'PENDING_APPROVAL',
                message: messages[user.verificationStatus] || 'Account not approved.',
            })
        }

        const token = generateToken(user._id)
        res.json({
            success: true,
            message: 'Login successful',
            data: buildUserResponse(user, token),
        })
    } catch (err) {
        next(err)
    }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
    try {
        // req.user is already loaded by the protect middleware
        const user = await User.findById(req.user._id).populate('companyId', 'name slug status plan trialEndsAt modules settings')
        if (!user) return res.status(404).json({ success: false, message: 'User not found' })

        // For staff-role users, attach their permission set from the Staff
        // collection so the frontend can filter the sidebar / hide actions.
        // Note: this is purely for UX — backend routes don't currently
        // enforce these permissions (a staff user with broad UI access
        // can still hit any admin endpoint by URL). Adding API enforcement
        // would be a separate batch. (Batch 30.)
        let staffPermissions = null
        if (user.role === 'staff') {
            const Staff = require('../models/Staff')
            const staffRecord = await Staff.findOne({ user: user._id }).lean()
            if (staffRecord && Array.isArray(staffRecord.permissions)) {
                staffPermissions = staffRecord.permissions
            }
        }

        res.json({
            success: true,
            data: {
                ...user.toObject(),
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                staffPermissions,
            },
        })
    } catch (err) {
        next(err)
    }
}

// ─────────────────────────────────────────────────────────────────
// PUT /api/auth/profile
// ─────────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
    try {
        const { firstName, lastName, phone, address, gender, dateOfBirth, avatar } = req.body

        const updates = {}
        if (firstName   !== undefined) updates.firstName   = firstName
        if (lastName    !== undefined) updates.lastName    = lastName
        if (phone       !== undefined) updates.phone       = phone
        if (address     !== undefined) updates.address     = address
        if (gender      !== undefined) updates.gender      = gender
        if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth
        if (avatar      !== undefined) updates.avatar      = avatar

        const user = await User.findByIdAndUpdate(req.user._id, updates, {
            new: true,
            runValidators: true,
        })
        res.json({ success: true, data: user })
    } catch (err) {
        next(err)
    }
}

// ─────────────────────────────────────────────────────────────────
// PUT /api/auth/change-password
// ─────────────────────────────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Both current and new password are required',
            })
        }
        if (String(newPassword).length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters',
            })
        }

        const user = await User.findById(req.user._id).select('+password')
        const isMatch = await user.comparePassword(currentPassword)
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' })
        }

        user.password = newPassword  // pre-save hook will hash
        await user.save()

        res.json({ success: true, message: 'Password updated successfully' })
    } catch (err) {
        next(err)
    }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
// Body: { otp }  — user must be logged in
// ─────────────────────────────────────────────────────────────────
exports.verifyOtp = async (req, res, next) => {
    try {
        const { otp } = req.body
        if (!otp) return res.status(400).json({ success: false, message: 'OTP is required' })

        const user = await User.findById(req.user._id).select('+emailOtp +emailOtpExpiry')
        if (!user) return res.status(404).json({ success: false, message: 'User not found' })

        if (user.isEmailVerified) {
            return res.json({ success: true, message: 'Email already verified' })
        }

        if (!user.emailOtp || !user.emailOtpExpiry) {
            return res.status(400).json({
                success: false,
                message: 'No OTP pending. Request a new one.',
            })
        }

        if (user.emailOtpExpiry < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Request a new one.',
            })
        }

        if (String(user.emailOtp) !== String(otp)) {
            return res.status(400).json({ success: false, message: 'Incorrect OTP' })
        }

        user.isEmailVerified = true
        user.emailOtp = null
        user.emailOtpExpiry = null
        await user.save()

        res.json({ success: true, message: 'Email verified successfully' })
    } catch (err) {
        next(err)
    }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/resend-otp  — user must be logged in
// ─────────────────────────────────────────────────────────────────
exports.resendOtp = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id)
        if (!user) return res.status(404).json({ success: false, message: 'User not found' })
        if (user.isEmailVerified) {
            return res.json({ success: true, message: 'Email already verified' })
        }

        const otp = generateOtp()
        user.emailOtp = otp
        user.emailOtpExpiry = new Date(Date.now() + 10 * 60 * 1000)
        await user.save()

        sendOtpEmail({ to: user.email, name: user.firstName, otp })
            .catch(e => console.error('[resendOtp] Email failed:', e.message))

        res.json({ success: true, message: 'A new verification code has been sent to your email' })
    } catch (err) {
        next(err)
    }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// Body: { email }
// Always returns success (even if email doesn't exist) so attackers
// can't use this to enumerate registered emails.
// ─────────────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' })
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() })

        // Generic response regardless of whether user exists
        const genericMsg = 'If an account exists for that email, a reset link has been sent.'

        if (user) {
            // Generate a raw token (shown to user in URL) and store a hash in DB
            const rawToken  = crypto.randomBytes(32).toString('hex')
            const hashToken = crypto.createHash('sha256').update(rawToken).digest('hex')

            user.passwordResetToken  = hashToken
            user.passwordResetExpiry = new Date(Date.now() + 30 * 60 * 1000) // 30 min
            await user.save()

            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${rawToken}`

            sendPasswordResetEmail({ to: user.email, name: user.firstName, resetUrl })
                .catch(e => console.error('[forgotPassword] Email failed:', e.message))
        }

        res.json({ success: true, message: genericMsg })
    } catch (err) {
        next(err)
    }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password/:token
// Body: { password }
// ─────────────────────────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
    try {
        const { token } = req.params
        const { password } = req.body

        if (!password || String(password).length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters',
            })
        }

        const hashToken = crypto.createHash('sha256').update(token).digest('hex')

        const user = await User.findOne({
            passwordResetToken: hashToken,
            passwordResetExpiry: { $gt: new Date() },
        }).select('+password')

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Reset link is invalid or has expired. Request a new one.',
            })
        }

        user.password = password  // pre-save hook hashes
        user.passwordResetToken  = null
        user.passwordResetExpiry = null
        await user.save()

        res.json({ success: true, message: 'Password has been reset. You can now log in.' })
    } catch (err) {
        next(err)
    }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// JWT is stateless so there's nothing to invalidate server-side.
// Client must discard the token. Returns success for API symmetry.
// ─────────────────────────────────────────────────────────────────
exports.logout = (req, res) => {
    res.json({ success: true, message: 'Logged out' })
}

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/refresh  — stub (we don't use refresh tokens)
// Returning 401 here causes the frontend axios interceptor to
// log the user out on token expiry, which is the desired behavior.
// ─────────────────────────────────────────────────────────────────
exports.refresh = (req, res) => {
    res.status(401).json({ success: false, message: 'Please log in again' })
}

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/invite  (admin invites a staff member)
// Body: { email, firstName, lastName, role, permissions }
// Requires: protect middleware has set req.user, attachCompany has set req.company
// ─────────────────────────────────────────────────────────────────
exports.sendInvite = async (req, res, next) => {
    try {
        const { email, firstName, lastName, role = 'staff', permissions = [] } = req.body

        if (!email || !firstName) {
            return res.status(400).json({
                success: false,
                message: 'Email and first name are required',
            })
        }
        if (!req.company) {
            return res.status(400).json({
                success: false,
                message: 'Company context missing. Reload and try again.',
            })
        }

        const emailLower = email.toLowerCase().trim()

        // Reject if user already exists
        const existing = await User.findOne({ email: emailLower })
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'A user with this email already exists',
            })
        }

        // Generate an invite token (same approach as password reset)
        const rawToken  = crypto.randomBytes(32).toString('hex')
        const hashToken = crypto.createHash('sha256').update(rawToken).digest('hex')

        // Create a pending user account so the invite flow can activate it later.
        // Password is a random placeholder that the invitee replaces on accept.
        const placeholderPassword = crypto.randomBytes(16).toString('hex')
        const user = await User.create({
            firstName,
            lastName: lastName || '',
            email: emailLower,
            password: placeholderPassword,
            role,
            companyId: req.company._id,
            permissions,
            isActive: false, // activated when they accept
            isEmailVerified: false,
            passwordResetToken: hashToken,
            passwordResetExpiry: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
            invitedBy: req.user._id,
        })

        const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/accept-invite/${rawToken}`

        sendInviteEmail({
            to: user.email,
            gymName: req.company.name,
            inviterName: `${req.user.firstName} ${req.user.lastName}`.trim(),
            role,
            inviteUrl,
        }).catch(e => console.error('[sendInvite] Email failed:', e.message))

        res.status(201).json({
            success: true,
            message: `Invite sent to ${email}`,
            data: { _id: user._id, email: user.email, role: user.role },
        })
    } catch (err) {
        next(err)
    }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/auth/invite/:token
// Public endpoint — returns enough invite metadata for the AcceptInvite
// page to render a friendly "Welcome to PowerHouse Gym, [Name]" header
// before the user sets a password.
//
// Returns 404 if the token is unknown or expired (deliberately doesn't
// distinguish — leaks less to anyone probing).
// ─────────────────────────────────────────────────────────────────
exports.getInviteByToken = async (req, res, next) => {
    try {
        const rawToken = req.params.token
        if (!rawToken) {
            return res.status(400).json({ success: false, message: 'Token is required' })
        }
        const hashToken = crypto.createHash('sha256').update(rawToken).digest('hex')

        const user = await User.findOne({
            passwordResetToken: hashToken,
            passwordResetExpiry: { $gt: new Date() },
        }).populate('companyId', 'name slug')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'This invite link is invalid or has expired.',
            })
        }

        res.json({
            success: true,
            data: {
                firstName: user.firstName,
                lastName:  user.lastName,
                email:     user.email,
                role:      user.role,
                gymName:   user.companyId?.name || null,
                expiresAt: user.passwordResetExpiry,
            },
        })
    } catch (err) {
        next(err)
    }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/register-invite
// Body: { token, password }
// Activates a pending invited account.
//
// Behaviour by role (Batch 21):
//   - 'admin' / 'staff' invited by superadmin or gym admin → auto-approve
//     (the inviter has already vetted them).
//   - 'customer' invited by gym admin → set verificationStatus='pending'
//     and DO NOT issue a login token. Gym admin must approve them first.
// ─────────────────────────────────────────────────────────────────
exports.registerViaInvite = async (req, res, next) => {
    try {
        const { token, password } = req.body
        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message: 'Token and password are required',
            })
        }
        if (String(password).length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters',
            })
        }

        const hashToken = crypto.createHash('sha256').update(token).digest('hex')

        const user = await User.findOne({
            passwordResetToken: hashToken,
            passwordResetExpiry: { $gt: new Date() },
        }).select('+password')

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invite link is invalid or has expired. Ask your admin to resend it.',
            })
        }

        user.password = password
        user.isActive = true
        user.isEmailVerified = true  // invite implies email ownership
        user.passwordResetToken  = null
        user.passwordResetExpiry = null

        // Customers need a second approval after accepting the invite.
        // Other roles (admin/staff) trust their inviter.
        if (user.role === 'customer') {
            user.verificationStatus = 'pending'
        } else {
            user.verificationStatus = 'approved'
        }
        await user.save()

        // Customers don't get a login token — they have to wait for approval.
        if (user.role === 'customer') {
            return res.status(201).json({
                success: true,
                requiresApproval: true,
                message: 'Account set up. Your gym admin will approve your account shortly.',
                data: {
                    _id: user._id,
                    email: user.email,
                    verificationStatus: user.verificationStatus,
                },
            })
        }

        const authToken = generateToken(user._id)
        res.json({
            success: true,
            message: 'Account activated. Welcome to FitSync!',
            data: buildUserResponse(user, authToken),
        })
    } catch (err) {
        next(err)
    }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/auth/config
// Public endpoint. Tells the frontend which auth features are active
// on this deployment (email-based OTP, etc.). Used by the signup flow
// to decide whether to show the OTP screen.
// ─────────────────────────────────────────────────────────────────
exports.getAuthConfig = (req, res) => {
    res.json({
        success: true,
        data: {
            emailEnabled: isEmailEnabled(),
        },
    })
}

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp-public
// Body: { email, otp }
// Public version of verify-otp. Lets a not-yet-logged-in user verify
// their email after signup (when email is configured). Same OTP logic
// as the protected /verify-otp, but identifies the user by email.
//
// This is necessary because batch 13's register flow no longer issues
// a token — pending users have no way to call /verify-otp without
// being logged in.
// ─────────────────────────────────────────────────────────────────
exports.verifyOtpPublic = async (req, res, next) => {
    try {
        const { email, otp } = req.body
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required',
            })
        }

        const user = await User.findOne({ email: String(email).toLowerCase().trim() })
            .select('+emailOtp +emailOtpExpiry')

        // Generic message — don't leak whether the email exists
        const generic = { success: false, message: 'Incorrect or expired code.' }

        if (!user)                           return res.status(400).json(generic)
        if (user.isEmailVerified) {
            return res.json({ success: true, message: 'Email already verified' })
        }
        if (!user.emailOtp || !user.emailOtpExpiry) return res.status(400).json(generic)
        if (user.emailOtpExpiry < new Date())       return res.status(400).json(generic)
        if (String(user.emailOtp) !== String(otp))  return res.status(400).json(generic)

        user.isEmailVerified = true
        user.emailOtp = null
        user.emailOtpExpiry = null
        await user.save()

        res.json({
            success: true,
            message: 'Email verified. An administrator will approve your account shortly.',
        })
    } catch (err) { next(err) }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/resend-otp-public
// Body: { email }
// Same idea — public sibling of resend-otp. Generic response either
// way to avoid email enumeration.
// ─────────────────────────────────────────────────────────────────
exports.resendOtpPublic = async (req, res, next) => {
    try {
        const { email } = req.body
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' })
        }

        // No-op silently if email is disabled — the frontend shouldn't be
        // calling this endpoint in that case anyway.
        if (!isEmailEnabled()) {
            return res.json({
                success: true,
                message: 'If your email is registered, a new code has been sent.',
            })
        }

        const user = await User.findOne({ email: String(email).toLowerCase().trim() })

        // Generic success either way — don't leak whether email exists
        if (!user || user.isEmailVerified) {
            return res.json({
                success: true,
                message: 'If your email is registered, a new code has been sent.',
            })
        }

        const otp = generateOtp()
        user.emailOtp = otp
        user.emailOtpExpiry = new Date(Date.now() + 10 * 60 * 1000)
        await user.save()

        sendOtpEmail({ to: user.email, name: user.firstName, otp })
            .catch(e => console.error('[resendOtpPublic] Email failed:', e.message))

        res.json({
            success: true,
            message: 'If your email is registered, a new code has been sent.',
        })
    } catch (err) { next(err) }
}
