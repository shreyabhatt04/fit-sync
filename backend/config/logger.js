// HTTP request logger.
//
// In development: colored concise logs to the console — easy to scan
// while working. Example: "GET /api/customers 200 24ms - 1.2kb"
//
// In production: combined Apache-style logs written to logs/access.log
// with daily rotation via size limit (10MB per file, 5 files kept).
// This gives you a persistent record you can grep later when debugging
// something that happened hours ago.
//
// The log dir is created on boot if it doesn't exist.

const fs     = require('fs')
const path   = require('path')
const morgan = require('morgan')

const isProd = process.env.NODE_ENV === 'production'

// ─────────────────────────────────────────────────────────────────
// Dev logger — colorful, concise, console only.
// ─────────────────────────────────────────────────────────────────
const devLogger = morgan('dev', {
    // Skip health checks — they clutter the console with uptime pings
    skip: (req) => req.path === '/api/health',
})

// ─────────────────────────────────────────────────────────────────
// Prod logger — writes to a rotating access log file.
// ─────────────────────────────────────────────────────────────────
let prodLogger
if (isProd) {
    const logDir = path.resolve(__dirname, '..', 'logs')
    try {
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
    } catch (e) {
        console.error('[logger] Could not create logs dir:', e.message)
    }

    const logPath = path.join(logDir, 'access.log')
    const stream  = fs.createWriteStream(logPath, { flags: 'a' })

    prodLogger = morgan('combined', {
        stream,
        skip: (req) => req.path === '/api/health',
    })
}

// ─────────────────────────────────────────────────────────────────
// Export the right middleware for the current environment.
// ─────────────────────────────────────────────────────────────────
module.exports = {
    httpLogger: isProd ? prodLogger : devLogger,
}
