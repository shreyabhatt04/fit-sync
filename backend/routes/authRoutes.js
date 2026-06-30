const express = require('express')
const router  = express.Router()
const { protect } = require('../middleware/authMiddleware')
const { attachCompany } = require('../middleware/companyMiddleware')
const { authLimiter }   = require('../middleware/rateLimiters')
const v                 = require('../middleware/validators')
const ctrl    = require('../controllers/authController')

// ── Public auth endpoints (strict rate limit + validation) ─────
// authLimiter caps brute-force attempts. Validators reject malformed
// input before it hits the controller or DB.
router.post('/register',              authLimiter, ...v.register,           ctrl.register)
router.post('/register-invite',       authLimiter, ...v.registerViaInvite,  ctrl.registerViaInvite)
// Public — returns invite metadata so the AcceptInvite page can render
// a friendly welcome header before the user sets a password.
router.get('/invite/:token',          authLimiter, ctrl.getInviteByToken)
// Public — frontend reads this on app boot to know which auth features
// are active on this deployment (e.g. whether to show the OTP screen).
router.get('/config',                 ctrl.getAuthConfig)
// Public OTP verification — needed because new signups don't get a token
// until they're approved, so they can't call the protected /verify-otp.
router.post('/verify-otp-public',     authLimiter, ctrl.verifyOtpPublic)
router.post('/resend-otp-public',     authLimiter, ctrl.resendOtpPublic)
router.post('/login',                 authLimiter, ...v.login,              ctrl.login)
router.post('/forgot-password',       authLimiter, ...v.forgotPassword,     ctrl.forgotPassword)
router.post('/reset-password/:token', authLimiter, ...v.resetPassword,      ctrl.resetPassword)

// Refresh + logout don't need rate limiting or validation
router.post('/refresh', ctrl.refresh)
router.post('/logout',  ctrl.logout)

// ── Protected ──────────────────────────────────────────────────
router.use(protect)

router.get('/me',              ctrl.getMe)
router.put('/profile',         ctrl.updateProfile)
router.put('/change-password', ...v.changePassword, ctrl.changePassword)

router.post('/verify-otp', ctrl.verifyOtp)
router.post('/resend-otp', ctrl.resendOtp)

// Invite needs company context + validation
router.post('/invite', attachCompany, ...v.sendInvite, ctrl.sendInvite)

module.exports = router
