const Task = require('../models/Task')

// GET /api/tasks — returns both grouped (for kanban) and flat
exports.getTasks = async (req, res, next) => {
    try {
        const { status } = req.query
        const query = { companyId: req.companyId }
        if (status) query.status = status

        const tasks = await Task.find(query).sort({ createdAt: -1 })
        const grouped = {
            todo:       tasks.filter(t => t.status === 'todo'),
            inprogress: tasks.filter(t => t.status === 'inprogress'),
            done:       tasks.filter(t => t.status === 'done'),
        }
        res.json({ success: true, data: grouped, flat: tasks })
    } catch (err) { next(err) }
}

// POST /api/tasks
exports.createTask = async (req, res, next) => {
    try {
        const task = await Task.create({ ...req.body, companyId: req.companyId })
        res.status(201).json({ success: true, data: task, message: 'Task created' })
    } catch (err) { next(err) }
}

// PUT /api/tasks/:id
exports.updateTask = async (req, res, next) => {
    try {
        const { companyId, ...safe } = req.body
        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, companyId: req.companyId },
            safe,
            { new: true, runValidators: true }
        )
        if (!task) { res.statusCode = 404; throw new Error('Task not found') }
        res.json({ success: true, data: task, message: 'Task updated' })
    } catch (err) { next(err) }
}

// DELETE /api/tasks/:id
exports.deleteTask = async (req, res, next) => {
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.id, companyId: req.companyId })
        if (!task) { res.statusCode = 404; throw new Error('Task not found') }
        res.json({ success: true, message: 'Task deleted' })
    } catch (err) { next(err) }
}

// PUT /api/tasks/:id/move — change status only
exports.moveTask = async (req, res, next) => {
    try {
        const { status } = req.body
        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, companyId: req.companyId },
            { status },
            { new: true }
        )
        if (!task) { res.statusCode = 404; throw new Error('Task not found') }
        res.json({ success: true, data: task, message: 'Task moved' })
    } catch (err) { next(err) }
}
