const express = require('express')
const router  = express.Router()
const { protect, authorize } = require('../middleware/authMiddleware')
const { attachCompany, checkSubscription } = require('../middleware/companyMiddleware')
const { moduleGuard } = require('../middleware/moduleGuard')
const ctrl = require('../controllers/promotionController')

router.use(protect, authorize('admin', 'staff'), attachCompany, checkSubscription, moduleGuard('promotions'))

router.post('/send',           ctrl.sendPromotion)
router.get('/history',         ctrl.getPromotionHistory)
router.post('/mark-contacted', ctrl.markContacted)
router.get('/last-contacted',  ctrl.getLastContacted)

module.exports = router
