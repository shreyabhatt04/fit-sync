const express = require('express')
const router  = express.Router()
const { protect, authorize } = require('../middleware/authMiddleware')
const ctrl = require('../controllers/superadminController')

// Every route is superadmin-only. No attachCompany — superadmin has no company.
router.use(protect, authorize('superadmin'))

// Dashboard
router.get('/dashboard', ctrl.getDashboard)
router.get('/revenue',   ctrl.getRevenueChart)

// Companies
router.get('/companies',                    ctrl.getCompanies)
router.get('/companies/:id',                ctrl.getCompanyDetail)
router.patch('/companies/:id/status',       ctrl.setCompanyStatus)
router.patch('/companies/:id/extend-trial', ctrl.extendTrial)
router.patch('/companies/:id/modules',      ctrl.updateModules)

// Subscriptions across all companies
router.get('/subscriptions', ctrl.getAllSubscriptions)

// Users
router.get('/users',                     ctrl.getUsers)
router.patch('/users/:id/toggle-active', ctrl.toggleUserActive)

// Module Pricing
router.get('/module-prices',     ctrl.getModulePrices)
router.put('/module-prices/:id', ctrl.updateModulePrice)

// ─── Platform Billing (Batch 17, guide feedback #11b) ──────────
// FitSync's invoices to gyms — distinct from gym→customer payments.
// Stats endpoint must come BEFORE the dynamic /:id so Express matches
// "stats" as a literal route, not as an :id value.
router.get('/platform-invoices/stats', ctrl.getPlatformInvoiceStats)
router.get('/platform-invoices',       ctrl.getPlatformInvoices)
router.post('/platform-invoices',      ctrl.createPlatformInvoice)
router.patch('/platform-invoices/:id', ctrl.updatePlatformInvoice)
router.delete('/platform-invoices/:id',ctrl.deletePlatformInvoice)

// ─── Module-wise analytics (Batch 18, guide feedback #11c) ─────
// Returns adoption, customer-count, and revenue breakdowns per module.
router.get('/module-analytics', ctrl.getModuleAnalytics)

// ─── Invitations & approvals (Batch 21, guide feedback #5/#6) ──
router.post  ('/invite-admin',                       ctrl.inviteGymAdmin)
router.get   ('/pending-approvals',                  ctrl.getPendingGymAdmins)
router.post  ('/pending-approvals/:userId/approve',  ctrl.approveGymAdmin)
router.post  ('/pending-approvals/:userId/reject',   ctrl.rejectGymAdmin)

module.exports = router
