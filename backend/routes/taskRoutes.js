const express = require('express')
const router  = express.Router()
const { protect, authorize } = require('../middleware/authMiddleware')
const { attachCompany, checkSubscription } = require('../middleware/companyMiddleware')
const { moduleGuard } = require('../middleware/moduleGuard')
const ctrl = require('../controllers/taskController')

router.use(protect, authorize('admin', 'staff'), attachCompany, checkSubscription, moduleGuard('tasks'))

router.get('/',         ctrl.getTasks)
router.post('/',        ctrl.createTask)
router.put('/:id',      ctrl.updateTask)
router.put('/:id/move', ctrl.moveTask)
router.delete('/:id',   ctrl.deleteTask)

module.exports = router
