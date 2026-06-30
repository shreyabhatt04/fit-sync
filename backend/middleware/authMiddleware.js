const jwt  = require('jsonwebtoken')
const User = require('../models/User')

// ─────────────────────────────────────────────────────────────────
// protect — verifies JWT and attaches user to req.user
//
// All 401 / 403 responses now include a `code` field so the frontend
// interceptor can distinguish "definitely log out" from "just a route
// auth issue" — see Batch 20 (guide feedback #1: auto-logout on
// inactivity / screen sleep).
//
// Codes used here:
//   NO_TOKEN          — request had no Authorization header
//   TOKEN_EXPIRED     — JWT lifetime ran out, refresh/relogin needed
//   INVALID_TOKEN     — JWT signature bad or malformed
//   USER_DELETED      — token valid but referenced user is gone
//   ACCOUNT_INACTIVE  — admin disabled the account
// ─────────────────────────────────────────────────────────────────
exports.protect = async (req, res, next) => {
    try {
        let token
        if (req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1]
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                code:    'NO_TOKEN',
                message: 'Not authenticated. Please log in.',
            })
        }

        let decoded
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET)
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    code:    'TOKEN_EXPIRED',
                    message: 'Session expired. Please log in again.',
                })
            }
            return res.status(401).json({
                success: false,
                code:    'INVALID_TOKEN',
                message: 'Invalid token.',
            })
        }

        const user = await User.findById(decoded.id).select('-password')
        if (!user) {
            return res.status(401).json({
                success: false,
                code:    'USER_DELETED',
                message: 'User no longer exists.',
            })
        }
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                code:    'ACCOUNT_INACTIVE',
                message: 'Account deactivated. Contact support.',
            })
        }

        req.user = user
        next()
    } catch (err) {
        next(err)
    }
}

// ─────────────────────────────────────────────────────────────────
// authorize(...roles) — restrict to specific roles
// Usage: authorize('admin'), authorize('admin', 'superadmin')
// ─────────────────────────────────────────────────────────────────
exports.authorize = (...roles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            code: 'NO_TOKEN',
            message: 'Not authenticated',
        })
    }
    if (!roles.includes(req.user.role)) {
        // FORBIDDEN_ROLE — user IS authenticated, just not authorized for
        // this route. Frontend should NOT logout for this; just show a
        // permission-denied message.
        return res.status(403).json({
            success: false,
            code: 'FORBIDDEN_ROLE',
            message: `Access denied. Required role: ${roles.join(' or ')}`,
        })
    }
    next()
}

// Shorthand
exports.adminOnly = exports.authorize('admin')

// Legacy alias (kept for route files that still import this name)
exports.protectAllowExpired = exports.protect
