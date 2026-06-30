const express = require('express')
const router  = express.Router()
const { protect, authorize } = require('../middleware/authMiddleware')
const { attachCompany, checkSubscription } = require('../middleware/companyMiddleware')
const { moduleGuard } = require('../middleware/moduleGuard')
const ctrl = require('../controllers/subscriptionController')

router.use(protect, attachCompany, checkSubscription, moduleGuard('memberships'))

// Specific route must be before /:id
router.get('/renewals/upcoming', authorize('admin', 'staff'), ctrl.getUpcomingRenewals)

router.get('/',       ctrl.getSubscriptions)
router.post('/',      authorize('admin', 'staff'), ctrl.createSubscription)
router.put('/:id',    authorize('admin', 'staff'), ctrl.updateSubscription)
router.delete('/:id', authorize('admin'),          ctrl.deleteSubscription)

module.exports = router
