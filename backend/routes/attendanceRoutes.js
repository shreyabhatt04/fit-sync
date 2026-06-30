const express = require('express')
const router  = express.Router()
const { protect, authorize } = require('../middleware/authMiddleware')
const { attachCompany, checkSubscription } = require('../middleware/companyMiddleware')
const { moduleGuard } = require('../middleware/moduleGuard')
const ctrl = require('../controllers/attendanceController')

router.use(protect, attachCompany, checkSubscription, moduleGuard('attendance'))

router.get('/summary', authorize('admin', 'staff'), ctrl.getAttendanceSummary)

router.get('/',  ctrl.getAttendance)
router.post('/', authorize('admin', 'staff'), ctrl.markAttendance)

module.exports = router
