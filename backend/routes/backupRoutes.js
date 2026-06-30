const express = require('express')
const router  = express.Router()
const { protect, authorize } = require('../middleware/authMiddleware')
const { attachCompany, checkSubscription } = require('../middleware/companyMiddleware')
const ctrl = require('../controllers/backupController')

router.use(protect, authorize('admin'), attachCompany, checkSubscription)

router.get('/download', ctrl.downloadBackup)
router.get('/history',  ctrl.getBackupHistory)

module.exports = router
