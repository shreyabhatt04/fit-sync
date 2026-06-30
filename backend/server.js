const express = require('express')
const dotenv  = require('dotenv')
const cors    = require('cors')
const path    = require('path')
const connectDB = require('./config/db')

dotenv.config()

// ── Startup env validation ──────────────────────────────────────
// Fail loudly at boot rather than waiting for the first request to
// crash with a cryptic "secretOrPrivateKey must have a value" error.
// Anything in this list MUST be set in backend/.env or the server
// won't start. (Batch 27.)
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET']
const missing = REQUIRED_ENV.filter(k => !process.env[k])
if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:\n')
    missing.forEach(k => console.error(`   - ${k}`))
    console.error('\nSee backend/.env (create it from the template if needed).')
    console.error('Refer to SETUP.md → "Configure environment variables".\n')
    process.exit(1)
}

// Optional warnings — server still starts but features are degraded
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠  EMAIL_USER / EMAIL_PASS not set — OTP emails will only print to console.')
    console.warn('   New signup flow demos still work (read OTP from terminal).')
    console.warn('   See backend/EMAIL_SETUP.md to configure Gmail SMTP.\n')
}

connectDB()

const app = express()

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Static uploads (staff documents, etc.) ──────────────────────
// Files are stored under backend/uploads and served at /uploads/*.
// This is NOT under /api so the URLs returned by upload endpoints
// (e.g. /uploads/staff-documents/<uuid>.pdf) work directly when the
// frontend prepends the server origin.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ── Routes ──────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/authRoutes'))
app.use('/api/companies',     require('./routes/companyRoutes'))
app.use('/api/customers',     require('./routes/customerRoutes'))
app.use('/api/memberships',   require('./routes/membershipRoutes'))
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'))
app.use('/api/attendance',    require('./routes/attendanceRoutes'))
app.use('/api/payments',      require('./routes/paymentRoutes'))
app.use('/api/reports',       require('./routes/reportRoutes'))
app.use('/api/enquiries',     require('./routes/enquiryRoutes'))
app.use('/api/expenses',      require('./routes/expenseRoutes'))
app.use('/api/tasks',         require('./routes/taskRoutes'))
app.use('/api/targets',       require('./routes/targetRoutes'))
app.use('/api/branches',      require('./routes/branchRoutes'))
app.use('/api/staff',         require('./routes/staffRoutes'))
app.use('/api/gym-staff',     require('./routes/gymStaffRoutes'))
app.use('/api/notifications',  require('./routes/notificationRoutes'))
app.use('/api/backup',        require('./routes/backupRoutes'))
app.use('/api/promotions',    require('./routes/promotionRoutes'))
app.use('/api/superadmin',    require('./routes/superadminRoutes'))

// ── Health check ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'FitSync API running', timestamp: new Date() })
})

app.use(require('./middleware/errorMiddleware'))
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }))

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`)
    // Schedule the daily 00:30 IST cron that auto-expires trials, expires
    // past-end-date subscriptions, and emits membership-expiry notifications.
    // Has to be started here — the jobs module just exports functions.
    require('./jobs/subscriptionCron').startSubscriptionCron()
})
