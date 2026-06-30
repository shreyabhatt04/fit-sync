// Input validators for the highest-risk endpoints.
//
// Uses express-validator. Each export is an array of middleware that
// you spread into a route definition:
//
//     router.post('/login', ...validators.login, ctrl.login)
//
// The final entry (`handleValidation`) turns any collected errors into
// a standard 400 response before the controller runs.

const { body, validationResult } = require('express-validator')

// express-validator's `.normalizeEmail()` defaults strip dots from
// gmail addresses (because Gmail itself treats r.a.h.u.l@gmail.com and
// rahul@gmail.com as the same mailbox). For OUR database the email is
// the literal lookup key — when a user signs up with `rahul.sharma@gmail.com`
// we store it with the dot, and they expect to log in with the dot.
//
// Default normalization breaks the seeded customer login (rahul.sharma@gmail.com)
// and would silently break any future gmail customer too.
//
// We keep lowercase + trim, but disable the dot-removal trick.
const NORMALIZE_EMAIL = {
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    outlookdotcom_remove_subaddress: false,
    yahoo_remove_subaddress: false,
    icloud_remove_subaddress: false,
}

// Central handler — if any validator above it failed, turn the errors
// into a single 400 response. Otherwise fall through to the controller.
const handleValidation = (req, res, next) => {
    const errors = validationResult(req)
    if (errors.isEmpty()) return next()

    // Return only the first error per field — cleaner for the frontend
    const messages = {}
    for (const err of errors.array()) {
        if (!messages[err.path]) messages[err.path] = err.msg
    }
    return res.status(400).json({
        success: false,
        message: Object.values(messages).join(', '),
        errors:  messages,
    })
}

// ─────────────────────────────────────────────────────────────────
// /auth/register — creates a Company + admin User together
// ─────────────────────────────────────────────────────────────────
const register = [
    body('firstName').trim().notEmpty().withMessage('First name is required')
        .isLength({ max: 50 }).withMessage('First name too long'),
    body('lastName').trim().notEmpty().withMessage('Last name is required')
        .isLength({ max: 50 }).withMessage('Last name too long'),
    body('gymName').trim().notEmpty().withMessage('Gym name is required')
        .isLength({ max: 100 }).withMessage('Gym name too long'),
    body('email').trim().isEmail().withMessage('Valid email is required')
        .normalizeEmail(NORMALIZE_EMAIL),
    body('phone').trim().notEmpty().withMessage('Phone is required')
        .isLength({ min: 7, max: 20 }).withMessage('Phone looks invalid'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
        .isLength({ max: 128 }).withMessage('Password too long'),
    handleValidation,
]

// ─────────────────────────────────────────────────────────────────
// /auth/login
// ─────────────────────────────────────────────────────────────────
const login = [
    body('email').trim().isEmail().withMessage('Valid email is required')
        .normalizeEmail(NORMALIZE_EMAIL),
    body('password').notEmpty().withMessage('Password is required')
        .isLength({ max: 128 }).withMessage('Password too long'),
    handleValidation,
]

// ─────────────────────────────────────────────────────────────────
// /auth/forgot-password
// ─────────────────────────────────────────────────────────────────
const forgotPassword = [
    body('email').trim().isEmail().withMessage('Valid email is required')
        .normalizeEmail(NORMALIZE_EMAIL),
    handleValidation,
]

// ─────────────────────────────────────────────────────────────────
// /auth/reset-password/:token
// ─────────────────────────────────────────────────────────────────
const resetPassword = [
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
        .isLength({ max: 128 }).withMessage('Password too long'),
    handleValidation,
]

// ─────────────────────────────────────────────────────────────────
// /auth/change-password (authenticated)
// ─────────────────────────────────────────────────────────────────
const changePassword = [
    body('currentPassword').notEmpty().withMessage('Current password is required')
        .isLength({ max: 128 }).withMessage('Password too long'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
        .isLength({ max: 128 }).withMessage('Password too long'),
    handleValidation,
]

// ─────────────────────────────────────────────────────────────────
// /auth/register-invite
// ─────────────────────────────────────────────────────────────────
const registerViaInvite = [
    body('token').trim().notEmpty().withMessage('Invite token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
        .isLength({ max: 128 }).withMessage('Password too long'),
    handleValidation,
]

// ─────────────────────────────────────────────────────────────────
// /auth/invite (send)
// ─────────────────────────────────────────────────────────────────
const sendInvite = [
    body('email').trim().isEmail().withMessage('Valid email is required')
        .normalizeEmail(NORMALIZE_EMAIL),
    body('firstName').trim().notEmpty().withMessage('First name is required')
        .isLength({ max: 50 }).withMessage('First name too long'),
    body('lastName').trim().notEmpty().withMessage('Last name is required')
        .isLength({ max: 50 }).withMessage('Last name too long'),
    body('role').optional().isIn(['admin', 'staff']).withMessage('Role must be admin or staff'),
    handleValidation,
]

module.exports = {
    register,
    login,
    forgotPassword,
    resetPassword,
    changePassword,
    registerViaInvite,
    sendInvite,
}
