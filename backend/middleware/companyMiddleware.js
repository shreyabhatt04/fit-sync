const Company = require('../models/Company')

// ─────────────────────────────────────────────────────────────────
// attachCompany — loads req.user.companyId's Company into req.company.
// Use AFTER protect. Rejects if the user has no company or the
// company doesn't exist or is suspended.
// ─────────────────────────────────────────────────────────────────
exports.attachCompany = async (req, res, next) => {
    try {
        // Superadmin has no company of their own; they're not scoped
        if (req.user.role === 'superadmin') return next()

        if (!req.user.companyId) {
            return res.status(403).json({
                success: false,
                message: 'Your account is not linked to any gym. Contact support.',
            })
        }

        const company = await Company.findById(req.user.companyId)
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Gym account not found.',
            })
        }

        if (company.status === 'suspended') {
            return res.status(403).json({
                success: false,
                code: 'ACCOUNT_SUSPENDED',
                message: 'Your gym account has been suspended. Contact support.',
            })
        }

        req.company = company
        req.companyId = company._id
        next()
    } catch (err) {
        next(err)
    }
}

// ─────────────────────────────────────────────────────────────────
// checkSubscription — returns 402 if trial expired or plan expired.
// Use AFTER attachCompany. Frontend should redirect to /subscribe.
// ─────────────────────────────────────────────────────────────────
exports.checkSubscription = async (req, res, next) => {
    try {
        if (req.user.role === 'superadmin') return next()

        const company = req.company
        if (!company) {
            return res.status(500).json({
                success: false,
                message: 'Internal: attachCompany must run before checkSubscription',
            })
        }

        // Active — all good
        if (company.status === 'active') return next()

        // Trial still valid
        if (company.status === 'trial' && company.trialEndsAt > new Date()) return next()

        // Trial expired or subscription expired
        return res.status(402).json({
            success: false,
            code: 'SUBSCRIPTION_EXPIRED',
            message: company.status === 'trial'
                ? 'Your free trial has ended. Please subscribe to continue.'
                : 'Your subscription has expired. Please renew to continue.',
            trialEndsAt: company.trialEndsAt,
        })
    } catch (err) {
        next(err)
    }
}

// ─────────────────────────────────────────────────────────────────
// scopeToCompany — injects companyId into req.body so controllers
// don't have to set it manually on create/update.
// ─────────────────────────────────────────────────────────────────
exports.scopeToCompany = (req, res, next) => {
    if (req.user.role === 'superadmin') return next()
    if (req.body && typeof req.body === 'object' && req.companyId) {
        req.body.companyId = req.companyId
    }
    next()
}
