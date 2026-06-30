const express = require('express')
const router  = express.Router()
const { protect, authorize } = require('../middleware/authMiddleware')
const { attachCompany } = require('../middleware/companyMiddleware')
const { uploadCompanyLogo } = require('../middleware/upload')
const ctrl = require('../controllers/companyController')

router.use(protect)

// ── Admin/staff: their own company ─────────────────────────────
router.route('/me')
    .get(authorize('admin', 'staff'), attachCompany, ctrl.getMyCompany)
    .put(authorize('admin'),          attachCompany, ctrl.updateMyCompany)

// ── Logo upload/remove (admin only) — Batch 22 ─────────────────
// The attachCompany middleware MUST run before multer so multer's
// filename callback can read req.company._id.
router.post('/me/logo',
    authorize('admin'), attachCompany,
    uploadCompanyLogo.single('logo'),
    ctrl.uploadLogo,
)
router.delete('/me/logo',
    authorize('admin'), attachCompany,
    ctrl.removeLogo,
)

// ── Public-safe payment info for QR & invoice rendering ────────
// Accessible to admin, staff AND customers — returns only bank/UPI
// fields plus the gym name. Owner PII and platform metadata are
// stripped in the controller.
router.get('/payment-info',
    authorize('admin', 'staff', 'customer'),
    attachCompany,
    ctrl.getPaymentInfo,
)

// ── Superadmin: manage all companies ───────────────────────────
router.route('/')
    .get(authorize('superadmin'),  ctrl.getAllCompanies)
    .post(authorize('superadmin'), ctrl.createCompany)

router.route('/:id')
    .get(authorize('superadmin'),    ctrl.getCompanyById)
    .put(authorize('superadmin'),    ctrl.updateCompany)
    .delete(authorize('superadmin'), ctrl.deleteCompany)

router.patch('/:id/status',  authorize('superadmin'), ctrl.setCompanyStatus)
router.patch('/:id/modules', authorize('superadmin'), ctrl.updateModules)

module.exports = router
