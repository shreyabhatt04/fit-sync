// Rate limiters for brute-force and DoS protection.
//
// All limiters use in-memory storage which is fine for a single-server
// deployment. For multi-server / horizontal scaling you'd want Redis
// via rate-limit-redis — not needed yet.
//
// Every threshold can be overridden with an env var so you can loosen
// things during development or a demo without code changes.

const rateLimit = require('express-rate-limit')

const parseInt10 = (v, fallback) => {
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? n : fallback
}

// ─────────────────────────────────────────────────────────────────
// Strict limiter for auth endpoints (login, register, forgot-password)
// Default: 20 requests per 15 minutes per IP. Tight enough to stop
// brute force, loose enough that a demo won't get locked out.
// ─────────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: parseInt10(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max:      parseInt10(process.env.AUTH_RATE_LIMIT_MAX, 20),
    standardHeaders: true,
    legacyHeaders:   false,
    message: {
        success: false,
        message: 'Too many attempts from this IP. Please try again in a few minutes.',
    },
    // Only count failed attempts so a legitimate user refreshing/re-loading
    // the page doesn't eat into their limit.
    skipSuccessfulRequests: true,
})

// ─────────────────────────────────────────────────────────────────
// General API limiter
// Default: 300 requests per 15 minutes per IP.
// Generous for a normal dashboard user (many pages load ~10 requests)
// but cuts off obvious scraping / DoS.
// ─────────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
    windowMs: parseInt10(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max:      parseInt10(process.env.API_RATE_LIMIT_MAX, 300),
    standardHeaders: true,
    legacyHeaders:   false,
    message: {
        success: false,
        message: 'Rate limit exceeded. Please slow down and try again soon.',
    },
    // Don't rate-limit the health check (used by uptime monitors)
    skip: (req) => req.path === '/api/health',
})

module.exports = {
    authLimiter,
    apiLimiter,
}
