// backend/routes/notificationRoutes.js — Batch 12

const express = require('express')
const router  = express.Router()
const ctrl = require('../controllers/notificationController')
const { protect, authorize } = require('../middleware/authMiddleware')
const { attachCompany } = require('../middleware/companyMiddleware')

router.use(
    protect,
    authorize('admin', 'staff', 'customer'),
    attachCompany,
)

router.get('/',                ctrl.getMine)
router.patch('/read-all',      ctrl.markAllRead)
router.patch('/:id/read',      ctrl.markRead)
router.delete('/:id',          ctrl.remove)

module.exports = router
