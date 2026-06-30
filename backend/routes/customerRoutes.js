const express = require('express')
const router  = express.Router()
const { protect, authorize } = require('../middleware/authMiddleware')
const { attachCompany, checkSubscription } = require('../middleware/companyMiddleware')
const { moduleGuard } = require('../middleware/moduleGuard')
const ctrl = require('../controllers/customerController')

router.use(protect, authorize('admin', 'staff'), attachCompany, checkSubscription, moduleGuard('members'))

router.get('/',       ctrl.getCustomers)
router.post('/',      ctrl.createCustomer)

// ─── Approval workflow (Batch 21, guide feedback #5/#6) ────────
// Static paths MUST come before /:id so Express doesn't route
// "pending-approvals" into the dynamic id handler.
router.get ('/pending-approvals',                  ctrl.getPendingCustomers)
router.post('/pending-approvals/:userId/approve',  ctrl.approveCustomer)
router.post('/pending-approvals/:userId/reject',   ctrl.rejectCustomer)

router.get('/:id',         ctrl.getCustomer)
router.put('/:id',         ctrl.updateCustomer)
router.delete('/:id',      ctrl.deleteCustomer)
router.post('/:id/invite', ctrl.inviteCustomer)

module.exports = router
