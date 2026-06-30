const express = require('express')
const router  = express.Router()
const { protect, authorize } = require('../middleware/authMiddleware')
const { attachCompany, checkSubscription } = require('../middleware/companyMiddleware')
const { moduleGuard } = require('../middleware/moduleGuard')
const ctrl = require('../controllers/expenseController')

// Expenses are part of the payments module
router.use(protect, authorize('admin', 'staff'), attachCompany, checkSubscription, moduleGuard('payments'))

router.get('/stats',  ctrl.getExpenseStats)

router.get('/',       ctrl.getExpenses)
router.post('/',      ctrl.createExpense)
router.put('/:id',    ctrl.updateExpense)
router.delete('/:id', ctrl.deleteExpense)

module.exports = router
