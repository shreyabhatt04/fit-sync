// Unified axios instance. Every service file imports this.
// Reads JWT from localStorage, handles 401/402 globally.

import axios from 'axios'

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: { 'Content-Type': 'application/json' },
})

// ── Request: attach JWT from localStorage ─────────────────────
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('fitsync_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

// ── Response: handle 401, 402, MODULE_NOT_ENABLED ─────────────
//
// Logout policy (Batch 20, guide feedback #1):
// We only clear local auth state and redirect to /login when the backend
// has explicitly told us the auth is bad. The backend codes that warrant
// this are TOKEN_EXPIRED, INVALID_TOKEN, NO_TOKEN, USER_DELETED.
// A bare 401 with no code (e.g. a route returning 401 for some app-level
// reason) is NOT treated as a session-killer — we just reject the promise
// and let the caller handle it.
//
// FORBIDDEN_ROLE (a 403) and other 403s are NOT logout triggers either —
// the user is logged in fine, just not authorized for this route.
const AUTH_LOGOUT_CODES = new Set([
    'TOKEN_EXPIRED',
    'INVALID_TOKEN',
    'NO_TOKEN',
    'USER_DELETED',
])

const performLogout = () => {
    localStorage.removeItem('fitsync_user')
    localStorage.removeItem('fitsync_token')
    if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
    }
}

API.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status
        const code   = error.response?.data?.code

        // Subscription expired or account suspended → /subscribe
        if (status === 402 || code === 'SUBSCRIPTION_EXPIRED' || code === 'ACCOUNT_SUSPENDED') {
            if (!window.location.pathname.includes('/subscribe')) {
                window.location.href = '/subscribe'
            }
            return Promise.reject(error)
        }

        // Module not enabled — let the page handle it (show upgrade prompt).
        if (code === 'MODULE_NOT_ENABLED') {
            return Promise.reject(error)
        }

        // Account inactive (admin disabled) — surface to the page, don't logout
        // because the user's token is still valid; they just can't act.
        if (code === 'ACCOUNT_INACTIVE') {
            return Promise.reject(error)
        }

        // Real auth failure → log out. Only the explicit auth codes trigger
        // this. Bare 401s without a recognised code stay where they are.
        if (status === 401 && code && AUTH_LOGOUT_CODES.has(code)) {
            performLogout()
            return Promise.reject(error)
        }

        // Status 401 without a recognised code — log a warning but don't
        // nuke the session. This guards against transient network blips,
        // CORS hiccups, and accidental 401s thrown by app logic. The page
        // making the request can still react to the error.
        if (status === 401) {
            console.warn('[api] Got 401 without an auth code — leaving session intact:', error.response?.data)
        }

        return Promise.reject(error)
    }
)

export default API

// Helpers kept for backward compatibility with anything that imported them
export const setAccessToken   = (token) => { if (token) localStorage.setItem('fitsync_token', token) }
export const getAccessToken   = ()      => localStorage.getItem('fitsync_token')
export const clearAccessToken = ()      => localStorage.removeItem('fitsync_token')
