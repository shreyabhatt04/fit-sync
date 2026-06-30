const express = require('express')
const router  = express.Router()
const { protect, authorize } = require('../middleware/authMiddleware')
const { attachCompany, checkSubscription } = require('../middleware/companyMiddleware')
const { moduleGuard } = require('../middleware/moduleGuard')
const ctrl = require('../controllers/paymentController')

router.use(protect, attachCompany, checkSubscription, moduleGuard('payments'))

router.get('/stats', authorize('admin', 'staff'), ctrl.getPaymentStats)
router.get('/due',   authorize('admin', 'staff'), ctrl.getDuePayments)

// Invoice PDF — admin/staff get any invoice in their company; customers
// get only their own. Row-level scoping is enforced inside the controller.
// MUST come before the dynamic /:id PUT/DELETE so Express doesn't try to
// match "/:id/pdf" against PUT/DELETE handlers.
router.get('/:id/pdf', ctrl.getInvoicePdf)

router.get('/',       ctrl.getPayments)
router.post('/',      authorize('admin', 'staff'), ctrl.createPayment)
router.put('/:id',    authorize('admin', 'staff'), ctrl.updatePayment)
router.delete('/:id', authorize('admin'),          ctrl.deletePayment)

module.exports = router
