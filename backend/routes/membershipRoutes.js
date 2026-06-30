const express = require('express')
const router  = express.Router()
const { protect, authorize } = require('../middleware/authMiddleware')
const { attachCompany, checkSubscription } = require('../middleware/companyMiddleware')
const { moduleGuard } = require('../middleware/moduleGuard')
const ctrl = require('../controllers/membershipController')

// GET is available to admin/staff/customer (customers need to browse plans)
router.use(protect, attachCompany, checkSubscription, moduleGuard('memberships'))

router.get('/',       ctrl.getMemberships)
router.post('/',      authorize('admin'), ctrl.createMembership)
router.put('/:id',    authorize('admin'), ctrl.updateMembership)
router.delete('/:id', authorize('admin'), ctrl.deleteMembership)

module.exports = router
