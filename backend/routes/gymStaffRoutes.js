const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/gymStaffController')
const { protect, authorize } = require('../middleware/authMiddleware')
const { attachCompany, checkSubscription } = require('../middleware/companyMiddleware')
const { moduleGuard } = require('../middleware/moduleGuard')
const { uploadStaffDoc } = require('../middleware/upload')

// Batch 19 (guide feedback #12): module-gated. A gym with the staff
// module disabled in their plan should not be able to hit any of these
// endpoints. Mirrors the older /api/staff route's middleware chain.
router.use(protect, authorize('admin'), attachCompany, checkSubscription, moduleGuard('staff'))

// Static / fixed paths must come BEFORE the dynamic /:id route, otherwise
// Express would try to match `:id = "trainers"` etc.
router.get('/',          ctrl.getAll)
router.get('/trainers',  ctrl.getTrainers)
router.get('/payroll',   ctrl.getPayroll)

router.get('/:id',       ctrl.getById)
router.post('/',         ctrl.create)
router.put('/:id',       ctrl.update)
router.delete('/:id',    ctrl.remove)

// Document upload — multer parses the multipart body and attaches req.file.
// The form field name MUST be "document" on the client side.
router.post(
    '/:id/document',
    uploadStaffDoc.single('document'),
    ctrl.uploadDocument,
)
router.delete('/:id/document', ctrl.removeDocument)

module.exports = router
