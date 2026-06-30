const express = require('express')
const router  = express.Router()
const { protect, authorize } = require('../middleware/authMiddleware')
const { attachCompany, checkSubscription } = require('../middleware/companyMiddleware')
const ctrl = require('../controllers/branchController')

router.use(protect, authorize('admin'), attachCompany, checkSubscription)

router.get('/',             ctrl.getBranches)
router.post('/',            ctrl.createBranch)
router.put('/:id',          ctrl.updateBranch)
router.delete('/:id',       ctrl.deleteBranch)
router.put('/:id/set-main', ctrl.setMainBranch)

module.exports = router
