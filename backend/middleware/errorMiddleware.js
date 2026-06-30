// Central error handler. Mounted last in server.js.
// Controllers pass errors via next(err); this turns them into JSON responses.

const isProd = () => process.env.NODE_ENV === 'production'

const errorMiddleware = (err, req, res, next) => {
    let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500
    let message = err.message || 'Internal server error'

    // Mongoose: bad ObjectId in a param or body
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 404
        message = 'Resource not found'
    }

    // Mongoose: duplicate key violation (unique / compound unique index)
    if (err.code === 11000) {
        statusCode = 400
        const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'field'
        const label = field.charAt(0).toUpperCase() + field.slice(1)
        message = `${label} already exists`
    }

    // Mongoose: validation error (required, enum, min/max, etc.)
    if (err.name === 'ValidationError') {
        statusCode = 400
        message = Object.values(err.errors).map(e => e.message).join(', ')
    }

    // JWT errors — treat as 401 so the frontend refresh flow triggers
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        statusCode = 401
        message = 'Invalid or expired token'
    }

    // Log every error server-side for debugging.
    // 5xx get full stack, 4xx get a one-liner. This keeps the prod log
    // useful for diagnosing issues without drowning in client-side noise.
    if (statusCode >= 500) {
        console.error(`[error] ${req.method} ${req.originalUrl}`)
        console.error(err)
    } else if (statusCode >= 400 && !isProd()) {
        // In dev, surface 4xx too — helpful when a frontend call is going wrong
        console.warn(`[warn] ${statusCode} ${req.method} ${req.originalUrl} — ${message}`)
    }

    // In production, never leak the raw error message for 500s — it can
    // reveal internals like field names, DB state, or stack traces.
    // Hand back a generic message and keep the real one in the server logs.
    let clientMessage = message
    if (isProd() && statusCode >= 500) {
        clientMessage = 'Internal server error. Please try again later.'
    }

    res.status(statusCode).json({
        success: false,
        message: clientMessage,
        // Only include stack in dev — never in prod
        ...(!isProd() && { stack: err.stack }),
    })
}

module.exports = errorMiddleware
