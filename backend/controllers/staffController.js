const Staff = require('../models/Staff')

const MODULES = Staff.MODULES

const ROLE_DEFAULTS = {
    super_admin: MODULES,
    manager: ['Dashboard', 'Customers', 'Attendance', 'Payments', 'Reports'],
    trainer: ['Dashboard', 'Customers', 'Attendance'],
    staff:   ['Dashboard', 'Customers'],
}

// GET /api/staff
exports.getStaff = async (req, res, next) => {
    try {
        const staffList = await Staff.find({ companyId: req.companyId }).sort({ createdAt: 1 })

        // Prepend the owner (the logged-in admin) as a non-deletable super_admin row
        const ownerEntry = {
            _id:         req.user._id,
            name:        `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
            email:       req.user.email,
            phone:       req.user.phone || '',
            role:        'super_admin',
            permissions: MODULES,
            isActive:    true,
            isOwner:     true,
        }

        res.json({ success: true, data: [ownerEntry, ...staffList] })
    } catch (err) { next(err) }
}

// POST /api/staff
exports.createStaff = async (req, res, next) => {
    try {
        const { name, email, phone, role, permissions } = req.body
        if (!name || !email) {
            res.statusCode = 400
            throw new Error('Name and email are required')
        }

        // Duplicate check — note the compound unique index on (companyId, email)
        // will also block this at the DB level, but this gives a cleaner message
        const existing = await Staff.findOne({ email: email.toLowerCase(), companyId: req.companyId })
        if (existing) {
            res.statusCode = 400
            throw new Error('A staff member with this email already exists')
        }

        const perms = permissions?.length ? permissions : (ROLE_DEFAULTS[role] || ROLE_DEFAULTS['staff'])

        const staff = await Staff.create({
            name,
            email: email.toLowerCase(),
            phone: phone || '',
            role:  role || 'staff',
            permissions: perms,
            companyId: req.companyId,
        })

        res.status(201).json({ success: true, data: staff, message: 'Staff member added' })
    } catch (err) { next(err) }
}

// PUT /api/staff/:id
exports.updateStaff = async (req, res, next) => {
    try {
        const { name, email, phone, role, permissions, isActive } = req.body
        const staff = await Staff.findOneAndUpdate(
            { _id: req.params.id, companyId: req.companyId },
            { name, email, phone, role, permissions, isActive },
            { new: true, runValidators: true }
        )
        if (!staff) { res.statusCode = 404; throw new Error('Staff member not found') }
        res.json({ success: true, data: staff, message: 'Staff updated' })
    } catch (err) { next(err) }
}

// DELETE /api/staff/:id
exports.deleteStaff = async (req, res, next) => {
    try {
        const staff = await Staff.findOneAndDelete({ _id: req.params.id, companyId: req.companyId })
        if (!staff) { res.statusCode = 404; throw new Error('Staff member not found') }
        res.json({ success: true, message: 'Staff member removed' })
    } catch (err) { next(err) }
}

// GET /api/staff/role-defaults/:role
exports.getRoleDefaults = (req, res) => {
    const permissions = ROLE_DEFAULTS[req.params.role] || ROLE_DEFAULTS['staff']
    res.json({ success: true, data: permissions })
}
