// Upload middleware — Batch 11 (guide feedback #6b)
//
// Handles file uploads for staff health-insurance documents. Stores files on
// the local filesystem at backend/uploads/staff-documents/<uuid>.<ext>.
// Files are served statically by server.js at /uploads/<...>.
//
// For a college project this is the right call — Cloudinary or S3 would mean
// API keys, signup, and an extra failure mode for a feature the user just
// wants to demo. If you ever migrate to cloud storage, swap the storage
// engine here; nothing else needs to change.

const multer = require('multer')
const path   = require('path')
const fs     = require('fs')
const crypto = require('crypto')

// Resolve to an absolute path so multer doesn't get confused by cwd.
const STAFF_DOCS_DIR = path.join(__dirname, '..', 'uploads', 'staff-documents')

// Make sure the directory exists at boot. Idempotent.
fs.mkdirSync(STAFF_DOCS_DIR, { recursive: true })

const ALLOWED_EXT = new Set(['.pdf', '.jpg', '.jpeg', '.png'])
const ALLOWED_MIME = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
])

const staffDocStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, STAFF_DOCS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase()
        // crypto.randomUUID is built-in (Node >= 14.17), no extra dep needed.
        const safeName = `${crypto.randomUUID()}${ext}`
        cb(null, safeName)
    },
})

const fileFilter = (req, file, cb) => {
    const ext  = path.extname(file.originalname || '').toLowerCase()
    const mime = (file.mimetype || '').toLowerCase()
    if (ALLOWED_EXT.has(ext) && ALLOWED_MIME.has(mime)) return cb(null, true)
    const err = new Error('Only PDF, JPG, and PNG files are allowed.')
    err.statusCode = 400
    cb(err, false)
}

// 5 MB hard limit — health-insurance papers fit comfortably under this.
exports.uploadStaffDoc = multer({
    storage: staffDocStorage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
})

// Helper used by controllers when removing a staff member or replacing a doc.
// Accepts either a server-relative URL ("/uploads/staff-documents/foo.pdf")
// or an absolute filesystem path. Silently ignores files that don't exist.
exports.deleteStaffDoc = (urlOrPath) => {
    if (!urlOrPath) return
    let abs
    if (urlOrPath.startsWith('/uploads/staff-documents/')) {
        abs = path.join(__dirname, '..', urlOrPath)
    } else if (path.isAbsolute(urlOrPath)) {
        abs = urlOrPath
    } else {
        return
    }
    // Defense-in-depth: never delete anything outside our docs dir.
    if (!abs.startsWith(STAFF_DOCS_DIR)) return
    fs.unlink(abs, () => { /* ignore — file may already be gone */ })
}

// ─────────────────────────────────────────────────────────────────
// Company logos — Batch 22 (gym Settings page logo upload).
//
// Mirrors the staff-documents pattern but with stricter rules:
//   - Images only (JPG / PNG / SVG / WebP)
//   - 2 MB hard limit (matches the UI's "PNG, JPG up to 2MB" hint)
//   - Filenames are <companyId>.<ext> so each gym has at most ONE logo
//     on disk — uploading a new logo overwrites the previous one without
//     leaving orphan files. The Company.logo field stores the public URL.
// ─────────────────────────────────────────────────────────────────
const COMPANY_LOGOS_DIR = path.join(__dirname, '..', 'uploads', 'company-logos')
fs.mkdirSync(COMPANY_LOGOS_DIR, { recursive: true })

const LOGO_ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.svg', '.webp'])
const LOGO_ALLOWED_MIME = new Set([
    'image/jpeg',
    'image/png',
    'image/svg+xml',
    'image/webp',
])

const companyLogoStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, COMPANY_LOGOS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase()
        // companyId comes from req.company (attachCompany middleware runs
        // before multer in the route chain).
        const companyId = req.company?._id?.toString() || crypto.randomUUID()
        cb(null, `${companyId}${ext}`)
    },
})

const logoFileFilter = (req, file, cb) => {
    const ext  = path.extname(file.originalname || '').toLowerCase()
    const mime = (file.mimetype || '').toLowerCase()
    if (LOGO_ALLOWED_EXT.has(ext) && LOGO_ALLOWED_MIME.has(mime)) return cb(null, true)
    const err = new Error('Only JPG, PNG, SVG, and WebP images are allowed.')
    err.statusCode = 400
    cb(err, false)
}

exports.uploadCompanyLogo = multer({
    storage: companyLogoStorage,
    fileFilter: logoFileFilter,
    limits: { fileSize: 2 * 1024 * 1024 },     // 2 MB
})

// Helper to remove a logo file when admin clears their logo, or when
// uploading a new one with a different extension (so JPG → PNG doesn't
// leave the old JPG sitting on disk).
exports.deleteCompanyLogo = (urlOrPath) => {
    if (!urlOrPath) return
    let abs
    if (urlOrPath.startsWith('/uploads/company-logos/')) {
        abs = path.join(__dirname, '..', urlOrPath)
    } else if (path.isAbsolute(urlOrPath)) {
        abs = urlOrPath
    } else {
        return
    }
    if (!abs.startsWith(COMPANY_LOGOS_DIR)) return
    fs.unlink(abs, () => { /* ignore */ })
}
