const express = require('express')
const router  = express.Router()
const { protect, authorize } = require('../middleware/authMiddleware')
const { attachCompany, checkSubscription } = require('../middleware/companyMiddleware')
const ctrl = require('../controllers/enquiryController')

// Enquiries are core CRM — not module-gated; always available to admin/staff
router.use(protect, authorize('admin', 'staff'), attachCompany, checkSubscription)

router.get('/stats',  ctrl.getEnquiryStats)

router.get('/',       ctrl.getEnquiries)
router.post('/',      ctrl.createEnquiry)
router.put('/:id',    ctrl.updateEnquiry)
router.delete('/:id', ctrl.deleteEnquiry)

module.exports = router
