const express = require('express')
const router  = express.Router()
const { protect, authorize } = require('../middleware/authMiddleware')
const { attachCompany, checkSubscription } = require('../middleware/companyMiddleware')
const { moduleGuard } = require('../middleware/moduleGuard')
const ctrl = require('../controllers/reportController')

// Dashboard stats is used by the main dashboard — keep it available to admin/staff
// but don't module-gate it (you always want to see basic stats even on trial).
router.use(protect, authorize('admin', 'staff'), attachCompany, checkSubscription)

router.get('/dashboard', ctrl.getDashboardStats)

// Financial report is behind the reports module
router.get('/financial', moduleGuard('reports'), ctrl.getFinancialReport)

// ─── GST reports (guide feedback #9c) ───────────────────────────
// GSTR-1 — outward supplies (sales). Behind the reports module.
router.get('/gstr1',     moduleGuard('reports'), ctrl.getGstr1Report)
router.get('/gstr1.csv', moduleGuard('reports'), ctrl.exportGstr1Csv)
// GSTR-2 — inward supplies (purchases / expenses).
router.get('/gstr2',     moduleGuard('reports'), ctrl.getGstr2Report)
router.get('/gstr2.csv', moduleGuard('reports'), ctrl.exportGstr2Csv)

module.exports = router
