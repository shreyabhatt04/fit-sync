const GymStaff = require('../models/GymStaff')
const Customer = require('../models/Customer')
const { deleteStaffDoc } = require('../middleware/upload')

// Whitelist of fields that can be set/updated by clients
const ALLOWED = [
    'staffType', 'name', 'email', 'phone', 'alternatePhone',
    'bloodGroup', 'maritalStatus', 'dateOfBirth', 'anniversary',
    'healthInsurance', 'healthInsuranceNote',
    'aadhaarOnFile', 'aadhaarLast4', 'panNumber',
    'monthlySalary',
    'achievements', 'isPersonalTrainer', 'personalTrainerSalary',
    'isActive',
    // Note: healthInsuranceDocUrl is NOT in ALLOWED — clients can't set it
    // directly via JSON. It is updated only via the upload/remove endpoints
    // below, so the URL always points to a real file we've stored.
]

const pick = (body) => {
    const out = {}
    for (const k of ALLOWED) if (body[k] !== undefined) out[k] = body[k]
    // Empty date strings → undefined so Mongoose doesn't complain
    if (out.dateOfBirth === '') out.dateOfBirth = undefined
    if (out.anniversary === '') out.anniversary = undefined
    return out
}

// GET /api/gym-staff
exports.getAll = async (req, res, next) => {
    try {
        const filter = { gymId: req.user._id }
        if (req.query.staffType) filter.staffType = req.query.staffType
        const list = await GymStaff.find(filter).sort({ createdAt: -1 })
        res.json({ success: true, data: list })
    } catch (err) { next(err) }
}

// GET /api/gym-staff/trainers — for customer assignment dropdown
exports.getTrainers = async (req, res, next) => {
    try {
        const list = await GymStaff.find({
            gymId: req.user._id,
            staffType: 'Trainer',
            isActive: true,
        }).select('name email isPersonalTrainer').sort({ name: 1 })
        res.json({ success: true, data: list })
    } catch (err) { next(err) }
}

// GET /api/gym-staff/payroll
// For each active trainer, returns:
//   { _id, name, monthlySalary, personalTrainerSalary,
//     ptCustomerCount, ptComponent, totalSalary }
//
// Formula (per guide feedback #6b — "adjust trainer salary based on personal
// training"):
//
//   totalSalary = monthlySalary + (assignedCustomers × personalTrainerSalary)
//
// where assignedCustomers is the count of Customer documents whose
// `assignedTrainer` references this staff member. PT salary only contributes
// for trainers who have isPersonalTrainer=true; for others, ptComponent is 0.
//
// Non-trainer staff are NOT returned — payroll page is trainer-focused.
exports.getPayroll = async (req, res, next) => {
    try {
        const trainers = await GymStaff.find({
            gymId: req.user._id,
            staffType: 'Trainer',
            isActive: true,
        }).select('name email monthlySalary isPersonalTrainer personalTrainerSalary')

        // One aggregation grouped by assignedTrainer is much cheaper than
        // N count queries — important once gyms have a real customer base.
        const counts = await Customer.aggregate([
            { $match: {
                companyId: req.companyId,
                assignedTrainer: { $ne: null },
            } },
            { $group: { _id: '$assignedTrainer', count: { $sum: 1 } } },
        ])
        const countMap = new Map(counts.map(r => [String(r._id), r.count]))

        const data = trainers.map(t => {
            const ptCustomerCount = countMap.get(String(t._id)) || 0
            const ptComponent = t.isPersonalTrainer
                ? ptCustomerCount * (t.personalTrainerSalary || 0)
                : 0
            const totalSalary = (t.monthlySalary || 0) + ptComponent
            return {
                _id: t._id,
                name: t.name,
                email: t.email,
                monthlySalary: t.monthlySalary || 0,
                isPersonalTrainer: !!t.isPersonalTrainer,
                personalTrainerSalary: t.personalTrainerSalary || 0,
                ptCustomerCount,
                ptComponent,
                totalSalary,
            }
        })
        res.json({ success: true, data })
    } catch (err) { next(err) }
}

// GET /api/gym-staff/:id
exports.getById = async (req, res, next) => {
    try {
        const s = await GymStaff.findOne({ _id: req.params.id, gymId: req.user._id })
        if (!s) { res.statusCode = 404; throw new Error('Staff member not found') }
        res.json({ success: true, data: s })
    } catch (err) { next(err) }
}

// POST /api/gym-staff
exports.create = async (req, res, next) => {
    try {
        const data = pick(req.body)
        if (!data.name || !data.email || !data.staffType) {
            res.statusCode = 400
            throw new Error('Name, email and staff type are required')
        }
        // Duplicate email per gym
        const existing = await GymStaff.findOne({ email: data.email, gymId: req.user._id })
        if (existing) {
            res.statusCode = 400
            throw new Error('A staff member with this email already exists')
        }
        const created = await GymStaff.create({
            ...data,
            gymId: req.user._id,
            companyId: req.company?._id,
        })
        res.status(201).json({ success: true, data: created })
    } catch (err) { next(err) }
}

// PUT /api/gym-staff/:id
exports.update = async (req, res, next) => {
    try {
        const data = pick(req.body)
        const updated = await GymStaff.findOneAndUpdate(
            { _id: req.params.id, gymId: req.user._id },
            { $set: data },
            { new: true, runValidators: true }
        )
        if (!updated) { res.statusCode = 404; throw new Error('Staff member not found') }
        res.json({ success: true, data: updated })
    } catch (err) { next(err) }
}

// DELETE /api/gym-staff/:id
exports.remove = async (req, res, next) => {
    try {
        const deleted = await GymStaff.findOneAndDelete({ _id: req.params.id, gymId: req.user._id })
        if (!deleted) { res.statusCode = 404; throw new Error('Staff member not found') }
        // Clean up any uploaded health-insurance document
        deleteStaffDoc(deleted.healthInsuranceDocUrl)
        res.json({ success: true, message: 'Staff member removed' })
    } catch (err) { next(err) }
}

// POST /api/gym-staff/:id/document
// Stores the uploaded file's server-relative URL on the staff record. If the
// staff member already had a document, the previous file is deleted from disk
// so we don't accumulate orphans.
exports.uploadDocument = async (req, res, next) => {
    try {
        if (!req.file) {
            res.statusCode = 400
            throw new Error('No file uploaded. Please select a PDF, JPG, or PNG.')
        }
        const staff = await GymStaff.findOne({ _id: req.params.id, gymId: req.user._id })
        if (!staff) {
            // Roll back the just-uploaded file if the staff member doesn't belong to this gym
            deleteStaffDoc(req.file.filename ? `/uploads/staff-documents/${req.file.filename}` : null)
            res.statusCode = 404
            throw new Error('Staff member not found')
        }
        // Replace previous doc, if any
        if (staff.healthInsuranceDocUrl) deleteStaffDoc(staff.healthInsuranceDocUrl)

        const url = `/uploads/staff-documents/${req.file.filename}`
        staff.healthInsuranceDocUrl = url
        await staff.save()
        res.status(201).json({
            success: true,
            data: { healthInsuranceDocUrl: url },
            message: 'Document uploaded',
        })
    } catch (err) { next(err) }
}

// DELETE /api/gym-staff/:id/document
exports.removeDocument = async (req, res, next) => {
    try {
        const staff = await GymStaff.findOne({ _id: req.params.id, gymId: req.user._id })
        if (!staff) { res.statusCode = 404; throw new Error('Staff member not found') }
        if (staff.healthInsuranceDocUrl) {
            deleteStaffDoc(staff.healthInsuranceDocUrl)
            staff.healthInsuranceDocUrl = ''
            await staff.save()
        }
        res.json({ success: true, message: 'Document removed' })
    } catch (err) { next(err) }
}
