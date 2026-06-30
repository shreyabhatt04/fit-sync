const Company = require('../models/Company')
const User = require('../models/User')
const { deleteCompanyLogo } = require('../middleware/upload')

// ─────────────────────────────────────────────────────────────────
// GET /api/companies/me
// Admin gets their own company details
// ─────────────────────────────────────────────────────────────────
exports.getMyCompany = async (req, res, next) => {
  try {
    res.json({ success: true, data: req.company })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/companies/payment-info
// Returns ONLY the public-safe fields needed to render the UPI QR
// and bank details on customer-facing screens. Accessible to admin,
// staff AND customers (customers need this to scan & pay).
// Deliberately excludes owner Aadhaar/PAN, plan, status, modules, etc.
// ─────────────────────────────────────────────────────────────────
exports.getPaymentInfo = async (req, res, next) => {
  try {
    const c = req.company
    res.json({
      success: true,
      data: {
        name: c.name,
        gstNumber: c.gstNumber || '',
        bankDetails: {
          bankName:          c.bankDetails?.bankName || '',
          accountNumber:     c.bankDetails?.accountNumber || '',
          ifsc:              c.bankDetails?.ifsc || '',
          accountHolderName: c.bankDetails?.accountHolderName || '',
          upiId:             c.bankDetails?.upiId || '',
        },
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────────
// PUT /api/companies/me
// Admin updates their own company info (name, address, phone etc.)
// ─────────────────────────────────────────────────────────────────
exports.updateMyCompany = async (req, res, next) => {
  try {
    const allowed = [
      // Gym info
      'name', 'email', 'phone', 'address', 'city', 'state',
      'established', 'website', 'description', 'gstNumber',
      // Owner info (sub-document)
      'owner',
      // Bank / UPI info (sub-document) — used for invoices and QR codes
      'bankDetails',
      // Settings
      'settings',
    ]
    const updates = {}
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    })

    const company = await Company.findByIdAndUpdate(
      req.company._id,
      { $set: updates },
      { new: true, runValidators: true }
    )

    res.json({ success: true, data: company })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/companies  (superadmin)
// ─────────────────────────────────────────────────────────────────
exports.getAllCompanies = async (req, res, next) => {
  try {
    const { status, plan, page = 1, limit = 20, search } = req.query

    const filter = {}
    if (status) filter.status = status
    if (plan)   filter.plan   = plan
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { slug:  { $regex: search, $options: 'i' } },
      ]
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit)
    const total = await Company.countDocuments(filter)
    const companies = await Company.find(filter)
      .populate('ownerId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    res.json({
      success: true,
      data: companies,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/companies  (superadmin — manual company creation)
// ─────────────────────────────────────────────────────────────────
exports.createCompany = async (req, res, next) => {
  try {
    const company = await Company.create(req.body)
    res.status(201).json({ success: true, data: company })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/companies/:id  (superadmin)
// ─────────────────────────────────────────────────────────────────
exports.getCompanyById = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id).populate(
      'ownerId',
      'firstName lastName email phone'
    )
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' })

    // Count members belonging to this company
    const memberCount = await User.countDocuments({
      companyId: company._id,
      role: 'customer',
    })

    res.json({ success: true, data: { ...company.toObject(), memberCount } })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────────
// PUT /api/companies/:id  (superadmin)
// ─────────────────────────────────────────────────────────────────
exports.updateCompany = async (req, res, next) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' })
    res.json({ success: true, data: company })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE /api/companies/:id  (superadmin)
// Soft-delete: just suspend instead of destroying data
// ─────────────────────────────────────────────────────────────────
exports.deleteCompany = async (req, res, next) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { status: 'suspended' },
      { new: true }
    )
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' })
    res.json({ success: true, message: 'Company suspended successfully', data: company })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────────
// PATCH /api/companies/:id/status  (superadmin)
// Body: { status: 'active' | 'suspended' | 'trial' | 'expired' }
// ─────────────────────────────────────────────────────────────────
exports.setCompanyStatus = async (req, res, next) => {
  try {
    const { status } = req.body
    const valid = ['active', 'suspended', 'trial', 'expired']
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${valid.join(', ')}` })
    }

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' })

    res.json({ success: true, data: company })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────────
// PATCH /api/companies/:id/modules  (superadmin)
// Body: { modules: { reports: true, tasks: false, ... } }
// ─────────────────────────────────────────────────────────────────
exports.updateModules = async (req, res, next) => {
  try {
    const { modules } = req.body
    if (!modules || typeof modules !== 'object') {
      return res.status(400).json({ success: false, message: 'modules object is required' })
    }

    // Build $set object for nested modules fields
    const setObj = {}
    Object.entries(modules).forEach(([key, value]) => {
      setObj[`modules.${key}`] = Boolean(value)
    })

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { $set: setObj },
      { new: true }
    )
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' })

    res.json({ success: true, data: company })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/companies/me/logo
// Admin uploads/replaces their gym logo. Multipart/form-data with a
// single 'logo' field. The uploadCompanyLogo multer middleware (in
// the route chain) writes the file to disk first; this handler only
// records the public URL on Company.logo and removes the previous file
// if the extension changed.
// ─────────────────────────────────────────────────────────────────
exports.uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' })
    }

    const company = await Company.findById(req.company._id)
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' })
    }

    // Build public URL — server.js exposes /uploads as a static directory.
    const newLogoUrl = `/uploads/company-logos/${req.file.filename}`

    // If the previous logo had a different extension, the file we just
    // wrote is at a new path and the old file is now orphaned. Clean up.
    if (company.logo && company.logo !== newLogoUrl) {
      deleteCompanyLogo(company.logo)
    }

    company.logo = newLogoUrl
    await company.save()

    res.json({ success: true, data: company })
  } catch (err) { next(err) }
}

// ─────────────────────────────────────────────────────────────────
// DELETE /api/companies/me/logo
// Admin clears their gym logo. Removes the file from disk AND clears
// Company.logo. Idempotent — succeeds even if no logo was set.
// ─────────────────────────────────────────────────────────────────
exports.removeLogo = async (req, res, next) => {
  try {
    const company = await Company.findById(req.company._id)
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' })
    }

    if (company.logo) {
      deleteCompanyLogo(company.logo)
      company.logo = null
      await company.save()
    }

    res.json({ success: true, data: company })
  } catch (err) { next(err) }
}
