const express = require('express')
const router  = express.Router()
const { protect, authorize } = require('../middleware/authMiddleware')
const { attachCompany, checkSubscription } = require('../middleware/companyMiddleware')
const { moduleGuard } = require('../middleware/moduleGuard')
const ctrl = require('../controllers/targetController')

router.use(protect, authorize('admin', 'staff'), attachCompany, checkSubscription, moduleGuard('targets'))

router.get('/',       ctrl.getTargets)
router.post('/',      ctrl.createTarget)
router.put('/:id',    ctrl.updateTarget)
router.delete('/:id', ctrl.deleteTarget)

module.exports = router
