// middleware/moduleGuard.js
// Gates a route behind "is this module enabled on the company's plan?"
// Use AFTER: protect → attachCompany → checkSubscription
//
//   const { moduleGuard } = require('../middleware/moduleGuard')
//   router.use(moduleGuard('reports'))

exports.moduleGuard = (moduleName) => (req, res, next) => {
    if (req.user?.role === 'superadmin') return next()

    const company = req.company
    if (!company) {
        return res.status(500).json({
            success: false,
            message: 'Internal: attachCompany must run before moduleGuard',
        })
    }

    if (!company.modules?.[moduleName]) {
        return res.status(403).json({
            success: false,
            code:    'MODULE_NOT_ENABLED',
            module:  moduleName,
            message: `The "${moduleName}" module is not active on your plan. Please upgrade.`,
        })
    }

    next()
}
