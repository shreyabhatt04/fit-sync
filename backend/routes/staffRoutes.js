const express = require('express')
const router  = express.Router()
const { protect, authorize } = require('../middleware/authMiddleware')
const { attachCompany, checkSubscription } = require('../middleware/companyMiddleware')
const { moduleGuard } = require('../middleware/moduleGuard')
const ctrl = require('../controllers/staffController')

router.use(protect, authorize('admin'), attachCompany, checkSubscription, moduleGuard('staff'))

router.get('/',                    ctrl.getStaff)
router.post('/',                   ctrl.createStaff)
router.get('/role-defaults/:role', ctrl.getRoleDefaults)
router.put('/:id',                 ctrl.updateStaff)
router.delete('/:id',              ctrl.deleteStaff)

module.exports = router
