const Expense = require('../models/Expense')

// GET /api/expenses
exports.getExpenses = async (req, res, next) => {
    try {
        const { category, page = 1, limit = 10 } = req.query
        const query = { companyId: req.companyId }
        if (category) query.category = category

        const total = await Expense.countDocuments(query)
        const expenses = await Expense.find(query)
            .populate('addedBy', 'firstName lastName')
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort({ date: -1 })

        res.json({
            success: true,
            data: expenses,
            pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
        })
    } catch (err) { next(err) }
}

// POST /api/expenses
exports.createExpense = async (req, res, next) => {
    try {
        const expense = await Expense.create({
            ...req.body,
            addedBy: req.user._id,
            companyId: req.companyId,
        })
        res.status(201).json({ success: true, data: expense, message: 'Expense added' })
    } catch (err) { next(err) }
}

// PUT /api/expenses/:id
exports.updateExpense = async (req, res, next) => {
    try {
        const { companyId, ...safe } = req.body
        const expense = await Expense.findOneAndUpdate(
            { _id: req.params.id, companyId: req.companyId },
            safe,
            { new: true, runValidators: true }
        )
        if (!expense) { res.statusCode = 404; throw new Error('Expense not found') }
        res.json({ success: true, data: expense, message: 'Expense updated' })
    } catch (err) { next(err) }
}

// DELETE /api/expenses/:id
exports.deleteExpense = async (req, res, next) => {
    try {
        const expense = await Expense.findOneAndDelete({ _id: req.params.id, companyId: req.companyId })
        if (!expense) { res.statusCode = 404; throw new Error('Expense not found') }
        res.json({ success: true, message: 'Expense deleted' })
    } catch (err) { next(err) }
}

// GET /api/expenses/stats
exports.getExpenseStats = async (req, res, next) => {
    try {
        const companyId = req.companyId
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        const [total, thisMonth, byCategory] = await Promise.all([
            Expense.aggregate([
                { $match: { companyId } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Expense.aggregate([
                { $match: { companyId, date: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Expense.aggregate([
                { $match: { companyId } },
                { $group: { _id: '$category', total: { $sum: '$amount' } } },
                { $sort: { total: -1 } },
            ]),
        ])

        res.json({
            success: true,
            data: {
                total:     total[0]?.total || 0,
                thisMonth: thisMonth[0]?.total || 0,
                byCategory,
            },
        })
    } catch (err) { next(err) }
}
