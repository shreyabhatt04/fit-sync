const crypto   = require('crypto')
const Customer = require('../models/Customer')
const User     = require('../models/User')
const { sendInviteEmail } = require('../utils/email')

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private/Admin
const getCustomers = async (req, res, next) => {
    try {
        const { search, status, plan, page = 1, limit = 10 } = req.query
        const query = { gymId: req.user._id }

        if (status) query.status = status
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ]
        }

        const total = await Customer.countDocuments(query)
        const customers = await Customer.find(query)
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort({ createdAt: -1 })

        res.json({
            success: true,
            data: customers,
            pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
        })
    } catch (error) {
        next(error)
    }
}

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private/Admin
const getCustomer = async (req, res, next) => {
    try {
        const customer = await Customer.findOne({ _id: req.params.id, gymId: req.user._id })
            .populate('assignedTrainer', 'name email staffType isPersonalTrainer')
        if (!customer) {
            res.statusCode = 404
            throw new Error('Customer not found')
        }
        res.json({ success: true, data: customer })
    } catch (error) {
        next(error)
    }
}

// @desc    Create customer
// @route   POST /api/customers
// @access  Private/Admin
const createCustomer = async (req, res, next) => {
    try {
        const customer = await Customer.create({ ...req.body, gymId: req.user._id })
        res.status(201).json({ success: true, data: customer, message: 'Customer added successfully' })
    } catch (error) {
        next(error)
    }
}

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private/Admin
const updateCustomer = async (req, res, next) => {
    try {
        const customer = await Customer.findOneAndUpdate(
            { _id: req.params.id, gymId: req.user._id },
            req.body,
            { new: true, runValidators: true }
        )
        if (!customer) {
            res.statusCode = 404
            throw new Error('Customer not found')
        }
        res.json({ success: true, data: customer, message: 'Customer updated' })
    } catch (error) {
        next(error)
    }
}

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private/Admin
const deleteCustomer = async (req, res, next) => {
    try {
        const customer = await Customer.findOneAndDelete({ _id: req.params.id, gymId: req.user._id })
        if (!customer) {
            res.statusCode = 404
            throw new Error('Customer not found')
        }
        res.json({ success: true, message: 'Customer deleted successfully' })
    } catch (error) {
        next(error)
    }
}

// ─── Invitations & approvals (Batch 21, guide feedback #5/#6) ──
//
// inviteCustomer creates a User row for an existing Customer record so they
// can log in to the customer portal. Until they accept the invite (set their
// password) and the admin approves, they can't actually sign in.
//
// Flow:
//   1. Admin opens an existing Customer → "Send login invite"
//   2. We create User { isActive:false, verificationStatus:'approved' until
//      accept; flips to 'pending' after they set a password — see
//      authController.registerViaInvite }
//   3. Email goes out with /accept-invite/:token link
//   4. Customer clicks link, sets password → User flips to pending
//   5. Admin approves from PendingApprovals page → User can now log in

// POST /api/customers/:id/invite
const inviteCustomer = async (req, res, next) => {
    try {
        const customer = await Customer.findOne({
            _id: req.params.id,
            gymId: req.user._id,
        })
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' })
        }

        const emailLower = String(customer.email || '').toLowerCase().trim()
        if (!emailLower) {
            return res.status(400).json({
                success: false,
                message: 'This customer has no email on file. Add one before sending an invite.',
            })
        }

        // If a User already exists for this email, surface it instead of duping.
        const existing = await User.findOne({ email: emailLower })
        if (existing) {
            return res.status(400).json({
                success: false,
                message: existing.isActive
                    ? 'This customer already has a login.'
                    : 'An invite has already been sent. Use "Resend invite" to refresh the link.',
            })
        }

        const rawToken  = crypto.randomBytes(32).toString('hex')
        const hashToken = crypto.createHash('sha256').update(rawToken).digest('hex')
        const placeholder = crypto.randomBytes(16).toString('hex')

        const user = await User.create({
            firstName: customer.firstName,
            lastName:  customer.lastName,
            email:     emailLower,
            phone:     customer.phone || '',
            password:  placeholder,
            role:      'customer',
            companyId: req.companyId,
            isActive:  false,                 // activated when invite accepted
            isEmailVerified: false,
            verificationStatus: 'approved',   // flips to 'pending' on accept
            passwordResetToken:  hashToken,
            passwordResetExpiry: new Date(Date.now() + 48 * 60 * 60 * 1000),
            invitedBy: req.user._id,
        })

        // Link the Customer to the new User row so future lookups can resolve
        // via either side of the join.
        customer.user = user._id
        await customer.save()

        const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/accept-invite/${rawToken}`

        sendInviteEmail({
            to: user.email,
            gymName: req.company?.name || 'your gym',
            inviterName: `${req.user.firstName} ${req.user.lastName}`.trim(),
            role: 'customer',
            inviteUrl,
        }).catch(e => console.error('[inviteCustomer] Email failed:', e.message))

        res.status(201).json({
            success: true,
            message: `Invite sent to ${customer.email}`,
            data: { _id: user._id, email: user.email, inviteUrl },
        })
    } catch (err) { next(err) }
}

// GET /api/customers/pending-approvals
// Lists customer Users who've accepted their invite and are waiting for
// gym-admin approval (verificationStatus='pending').
//
// Filters on isEmailVerified=true. Invited customers are auto-verified
// by registerViaInvite (the invite link itself proves email ownership),
// so they pass this filter. The explicit filter keeps the contract
// clear — only verified users get into the approval queue.
const getPendingCustomers = async (req, res, next) => {
    try {
        const filter = {
            companyId: req.companyId,
            role: 'customer',
            verificationStatus: 'pending',
            isEmailVerified: true,
        }

        const list = await User.find(filter).sort({ createdAt: -1 }).lean()
        res.json({ success: true, data: list, total: list.length })
    } catch (err) { next(err) }
}

// POST /api/customers/pending-approvals/:userId/approve
const approveCustomer = async (req, res, next) => {
    try {
        const user = await User.findOneAndUpdate(
            {
                _id: req.params.userId,
                companyId: req.companyId,
                role: 'customer',
                verificationStatus: 'pending',
            },
            { $set: { verificationStatus: 'approved' } },
            { new: true },
        )
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Pending customer not found',
            })
        }
        res.json({
            success: true,
            message: `${user.firstName} approved. They can now log in.`,
            data: { _id: user._id, email: user.email },
        })
    } catch (err) { next(err) }
}

// POST /api/customers/pending-approvals/:userId/reject
const rejectCustomer = async (req, res, next) => {
    try {
        const user = await User.findOneAndUpdate(
            {
                _id: req.params.userId,
                companyId: req.companyId,
                role: 'customer',
                verificationStatus: 'pending',
            },
            { $set: { verificationStatus: 'rejected' } },
            { new: true },
        )
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Pending customer not found',
            })
        }
        res.json({
            success: true,
            message: `${user.firstName}'s registration was rejected.`,
        })
    } catch (err) { next(err) }
}

module.exports = {
    getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
    inviteCustomer, getPendingCustomers, approveCustomer, rejectCustomer,
}