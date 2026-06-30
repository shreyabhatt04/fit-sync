import { createContext, useState, useEffect } from 'react'
import API, { setAccessToken, clearAccessToken } from '../utils/api'

export const AuthContext = createContext(null)

// Make sure user objects always have a computed "name" field so existing
// components that read user.name keep working.
const ensureName = (u) => {
    if (!u) return u
    if (u.name) return u
    const name = `${u.firstName || ''} ${u.lastName || ''}`.trim()
    return { ...u, name }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(null)
    const [loading, setLoading] = useState(true)

    // On app load, restore session from localStorage and refresh from server
    useEffect(() => {
        const savedUser  = localStorage.getItem('fitsync_user')
        const savedToken = localStorage.getItem('fitsync_token')

        if (!savedToken) {
            setLoading(false)
            return
        }

        setAccessToken(savedToken)
        setToken(savedToken)

        // Show cached user immediately so the UI doesn't blank out
        if (savedUser) {
            try { setUser(ensureName(JSON.parse(savedUser))) }
            catch { /* ignore corrupted JSON */ }
        }

        // Then fetch the fresh user + populated company (modules, etc.)
        API.get('/auth/me')
            .then(res => {
                const fresh = ensureName(res.data?.data || res.data)
                if (fresh) {
                    setUser(fresh)
                    localStorage.setItem('fitsync_user', JSON.stringify(fresh))
                }
            })
            .catch(() => { /* interceptor handles auth errors */ })
            .finally(() => setLoading(false))
    }, [])

    // login(userData, token) — tolerant of multiple call shapes
    const login = (userData, authToken) => {
        const rawUser = userData?.data && userData?.success !== undefined
            ? userData.data
            : userData

        const finalUser  = ensureName(rawUser)
        const finalToken = authToken || rawUser?.token || rawUser?.accessToken

        setUser(finalUser)
        setToken(finalToken)

        if (finalToken) {
            setAccessToken(finalToken)
            localStorage.setItem('fitsync_token', finalToken)
        }
        localStorage.setItem('fitsync_user', JSON.stringify(finalUser))

        // Fetch populated user (with company.modules) right after login
        if (finalToken) {
            API.get('/auth/me')
                .then(res => {
                    const fresh = ensureName(res.data?.data || res.data)
                    if (fresh) {
                        setUser(fresh)
                        localStorage.setItem('fitsync_user', JSON.stringify(fresh))
                    }
                })
                .catch(() => { /* keep partial user */ })
        }
    }

    const logout = () => {
        setUser(null)
        setToken(null)
        clearAccessToken()
        localStorage.removeItem('fitsync_user')
        localStorage.removeItem('fitsync_token')
    }

    const updateUser = (patch) => {
        setUser(prev => {
            const next = ensureName({ ...(prev || {}), ...patch })
            localStorage.setItem('fitsync_user', JSON.stringify(next))
            return next
        })
    }

    const isSuperadmin = () => user?.role === 'superadmin'
    const isAdmin      = () => user?.role === 'admin'
    const isStaff      = () => user?.role === 'staff'
    const isCustomer   = () => user?.role === 'customer'

    return (
        <AuthContext.Provider value={{
            user,
            token,
            loading,
            login,
            logout,
            updateUser,
            isSuperadmin,
            isAdmin,
            isStaff,
            isCustomer,
        }}>
            {children}
        </AuthContext.Provider>
    )
}
