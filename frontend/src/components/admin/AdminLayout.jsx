import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { notificationService } from '../../services/notificationService'
import { getInitials } from '../../utils/helpers'
import './AdminLayout.css'

// Path → required module map for sidebar filtering. Paths NOT in this map
// are considered always-available (Dashboard, Settings, Enquiries, etc.).
// Mirrors the moduleGuard middleware on the backend route files. If you
// add a new gated page, add its path here too — otherwise it will show
// for everyone regardless of module state.
const PATH_TO_MODULE = {
    '/admin/customers':         'members',
    '/admin/customers/pending': 'members',
    '/admin/attendance':        'attendance',
    '/admin/memberships':     'memberships',
    '/admin/subscriptions':   'memberships',
    '/admin/targets':         'targets',
    '/admin/tasks':           'tasks',
    '/admin/staff':           'staff',
    '/admin/payments':        'payments',
    '/admin/due-payments':    'payments',
    '/admin/invoices':        'payments',
    '/admin/reports':         'reports',
    '/admin/email-promotions': 'promotions',
}

// Maps menu paths to the corresponding Staff.permissions value.
// Used by the staff-only filter in the sidebar (Batch 30).
//
// Paths NOT in this map are considered "always-available" for staff —
// for example /admin/dashboard and /admin/settings (settings is its own
// permission but every staff has at least dashboard access).
//
// The values must match the strings in models/Staff.js MODULES const:
// 'Dashboard', 'Customers', 'Attendance', 'Memberships', 'Subscriptions',
// 'Payments', 'Reports', 'Enquiries', 'Targets', 'Tasks', 'Promotions',
// 'Settings'
const PATH_TO_PERMISSION = {
    '/admin/customers':           'Customers',
    '/admin/customers/pending':   'Customers',
    '/admin/attendance':          'Attendance',
    '/admin/memberships':         'Memberships',
    '/admin/subscriptions':       'Subscriptions',
    '/admin/targets':             'Targets',
    '/admin/tasks':               'Tasks',
    '/admin/staff':               'Settings',     // managing staff is an admin/settings concern
    '/admin/payments':            'Payments',
    '/admin/due-payments':        'Payments',
    '/admin/invoices':            'Payments',
    '/admin/reports':             'Reports',
    '/admin/email-promotions':    'Promotions',
    '/admin/enquiries':           'Enquiries',
    '/admin/expenses':            'Payments',     // expenses sits within payment-permission scope
}

const menuGroups = [
    {
        label: 'MAIN',
        items: [
            { path: '/admin/dashboard', label: 'Dashboard', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
            )},
        ],
    },
    {
        label: 'MANAGE',
        items: [
            { path: '/admin/customers', label: 'Customers', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
            )},
            { path: '/admin/customers/pending', label: 'Pending Approvals', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
            )},
            { path: '/admin/attendance', label: 'Attendance', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
            )},
            { path: '/admin/memberships', label: 'Memberships', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
            )},
            { path: '/admin/subscriptions', label: 'Subscriptions', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
            )},
            { path: '/admin/enquiries', label: 'Enquiries', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
            )},
            { path: '/admin/targets', label: 'Targets', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                </svg>
            )},
            { path: '/admin/tasks', label: 'Tasks', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                    <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                    <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
            )},
            { path: '/admin/staff', label: 'Staff', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
            )},
        ],
    },
    {
        label: 'ACCOUNTS',
        items: [
            { path: '/admin/payments', label: 'Payments', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
            )},
            { path: '/admin/due-payments', label: 'Due Payments', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
            )},
            { path: '/admin/invoices', label: 'Invoices', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                </svg>
            )},
            { path: '/admin/expenses', label: 'Expenses', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/>
                    <path d="M12 6v6l4 2"/>
                </svg>
            )},
        ],
    },
    {
        label: 'REPORTS',
        items: [
            { path: '/admin/reports', label: 'Reports', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
            )},
        ],
    },
    {
        label: 'PROMOTIONS',
        items: [
            { path: '/admin/email-promotions', label: 'Email Promotions', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                </svg>
            )},
        ],
    },
    {
        label: 'SETTINGS',
        items: [
            { path: '/admin/settings', label: 'Settings', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                </svg>
            )},
        ],
    },
]

function AdminLayout({ children }) {
    const [collapsed, setCollapsed] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)   // mobile drawer state
    const [profileOpen, setProfileOpen] = useState(false)
    const [notifOpen, setNotifOpen] = useState(false)
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const location = useLocation()
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const profileRef = useRef(null)
    const notifRef = useRef(null)

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
            if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Fetch notifications on mount + every 60 seconds while the layout is
    // mounted. Polling is fine for a college project — adding WebSockets
    // here would be massive scope creep for marginal benefit.
    useEffect(() => {
        let cancelled = false
        const fetchNotifs = async () => {
            try {
                const res = await notificationService.getMine()
                if (cancelled) return
                setNotifications(res.data || [])
                setUnreadCount(res.unreadCount || 0)
            } catch (err) {
                // Quiet failure — bell just shows whatever it had last time
                if (!cancelled) console.error('Notifications fetch failed:', err.message)
            }
        }
        fetchNotifs()
        const id = setInterval(fetchNotifs, 60_000)
        return () => { cancelled = true; clearInterval(id) }
    }, [])

    const handleMarkAllRead = async () => {
        if (unreadCount === 0) return
        try {
            await notificationService.markAllRead()
            setNotifications(prev => prev.map(n => ({ ...n, read: true })))
            setUnreadCount(0)
        } catch (err) {
            console.error('Mark-all-read failed:', err.message)
        }
    }

    // Friendly relative time — "10 min ago", "2 hr ago", "3 days ago"
    const relTime = (iso) => {
        const ms = Date.now() - new Date(iso).getTime()
        const min = Math.floor(ms / 60000)
        if (min < 1) return 'just now'
        if (min < 60) return `${min} min ago`
        const hr = Math.floor(min / 60)
        if (hr < 24) return `${hr} hr ago`
        const day = Math.floor(hr / 24)
        return `${day} day${day !== 1 ? 's' : ''} ago`
    }

    const isActive = (path) => location.pathname === path

    const getCurrentPageTitle = () => {
        for (const group of menuGroups) {
            for (const item of (group.items || [])) {
                if (location.pathname === item.path) return item.label
            }
        }
        return 'Dashboard'
    }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <div className={`admin-layout ${collapsed ? 'sidebar-collapsed' : ''} ${sidebarOpen ? 'mobile-sidebar-open' : ''}`}>
            {/* Sidebar */}
            <aside className="admin-sidebar">
                {/* Logo */}
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">
                        <svg viewBox="0 0 48 48" fill="currentColor" width="20" height="20">
                            <rect x="4" y="19" width="6" height="10" rx="2" opacity="0.9" />
                            <rect x="10" y="14" width="5" height="20" rx="2.5" />
                            <rect x="15" y="17" width="4" height="14" rx="2" opacity="0.85" />
                            <rect x="19" y="21" width="10" height="6" rx="3" />
                            <rect x="29" y="17" width="4" height="14" rx="2" opacity="0.85" />
                            <rect x="33" y="14" width="5" height="20" rx="2.5" />
                            <rect x="38" y="19" width="6" height="10" rx="2" opacity="0.9" />
                        </svg>
                    </div>
                    {!collapsed && <span className="sidebar-logo-text">FitSync</span>}
                </div>

                {/* Nav */}
                <nav className="sidebar-nav">
                    {menuGroups
                        .map((group) => {
                            // Two-layer filtering:
                            //
                            // Layer 1 (always): hide items whose company-level
                            // module is disabled. e.g. if the gym hasn't paid
                            // for "reports", the Reports menu item is hidden
                            // for everyone — admin and staff alike.
                            //
                            // Layer 2 (staff only): if the logged-in user is
                            // a staff member, additionally restrict to the
                            // permissions in their Staff.permissions array.
                            // Admin/owner sees everything within layer 1.
                            // (Batch 30 — adds the staff layer.)
                            //
                            // Superadmins and the brief loading window before
                            // /auth/me hydrates see all items — safer than
                            // flashing a stripped-down sidebar.
                            const modules = user?.companyId?.modules
                            const showAll = user?.role === 'superadmin' || !modules
                            let filteredItems = showAll
                                ? group.items
                                : group.items.filter((item) => {
                                    const mod = PATH_TO_MODULE[item.path]
                                    if (!mod) return true       // always-available
                                    return modules[mod] === true
                                })

                            // Layer 2: staff permissions
                            if (user?.role === 'staff' && Array.isArray(user.staffPermissions)) {
                                filteredItems = filteredItems.filter((item) => {
                                    const perm = PATH_TO_PERMISSION[item.path]
                                    if (!perm) return true      // always-available for staff
                                    return user.staffPermissions.includes(perm)
                                })
                            }

                            return { ...group, items: filteredItems }
                        })
                        .filter((group) => group.items.length > 0)  // hide empty groups
                        .map((group) => (
                        <div key={group.label} className="sidebar-group">
                            {!collapsed && (
                                <p className="sidebar-group-label">{group.label}</p>
                            )}
                            {group.items.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
                                    title={collapsed ? item.label : ''}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <span className="sidebar-item-icon">{item.icon}</span>
                                    {!collapsed && (
                                        <span className="sidebar-item-label">{item.label}</span>
                                    )}
                                    {isActive(item.path) && !collapsed && (
                                        <span className="sidebar-item-dot" />
                                    )}
                                </Link>
                            ))}
                        </div>
                    ))}
                </nav>

                {/* Collapse Button */}
                <button
                    className="sidebar-collapse-btn"
                    onClick={() => setCollapsed(!collapsed)}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {collapsed ? (
                            <polyline points="9 18 15 12 9 6" />
                        ) : (
                            <polyline points="15 18 9 12 15 6" />
                        )}
                    </svg>
                    {!collapsed && <span>Collapse</span>}
                </button>
            </aside>

            {/* Mobile backdrop — appears behind the drawer, tap to close */}
            {sidebarOpen && (
                <div
                    className="mobile-sidebar-backdrop"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Main Area */}
            <div className="admin-main">
                {/* Header */}
                <header className="admin-header">
                    <div className="header-left">
                        {/* Mobile hamburger — visible only on mobile via CSS */}
                        <button
                            className="mobile-sidebar-toggle"
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Open navigation"
                            type="button"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="3" y1="6"  x2="21" y2="6"  />
                                <line x1="3" y1="12" x2="21" y2="12" />
                                <line x1="3" y1="18" x2="21" y2="18" />
                            </svg>
                        </button>
                        <h1 className="header-title">{getCurrentPageTitle()}</h1>
                    </div>
                    <div className="header-right">
                        {/* Notifications */}
                        <div className="header-dropdown-wrapper" ref={notifRef}>
                            <button
                                className="header-icon-btn"
                                onClick={() => setNotifOpen(!notifOpen)}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                </svg>
                                {unreadCount > 0 && (
                                    <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                                )}
                            </button>
                            {notifOpen && (
                                <div className="header-dropdown notif-dropdown">
                                    <div className="dropdown-header">
                                        <span>Notifications</span>
                                        {unreadCount > 0 ? (
                                            <button
                                                onClick={handleMarkAllRead}
                                                style={{
                                                    background: 'transparent', border: 'none',
                                                    color: 'var(--primary, #10B981)',
                                                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                                    padding: 0,
                                                }}
                                            >
                                                Mark all read
                                            </button>
                                        ) : (
                                            <span className="dropdown-badge">0 new</span>
                                        )}
                                    </div>
                                    {notifications.length === 0 ? (
                                        <div style={{ padding: '24px 16px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                                            No notifications yet.
                                        </div>
                                    ) : (
                                        notifications.slice(0, 8).map((n) => {
                                            const isWarning = n.daysOut === 1
                                            const isInfo    = n.daysOut === 7 || n.daysOut === 15
                                            const type = isWarning ? 'warning' : isInfo ? 'info' : 'info'
                                            return (
                                                <div
                                                    key={n._id}
                                                    className={`notif-item notif-${type}`}
                                                    style={!n.read ? { background: 'rgba(16, 185, 129, 0.05)' } : undefined}
                                                >
                                                    <p className="notif-text" style={{ fontWeight: n.read ? 400 : 600 }}>
                                                        {n.title}
                                                    </p>
                                                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 4px' }}>
                                                        {n.message}
                                                    </p>
                                                    <p className="notif-time">{relTime(n.createdAt)}</p>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Profile */}
                        <div className="header-dropdown-wrapper" ref={profileRef}>
                            <button
                                className="header-profile-btn"
                                onClick={() => setProfileOpen(!profileOpen)}
                            >
                                <div className="avatar avatar-sm" style={{ background: '#111111', color: '#ffffff' }}>
                                    {getInitials(user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin' : 'Admin')}
                                </div>
                                {<span className="header-username">{user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin' : 'Admin'}</span>}
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>
                            {profileOpen && (
                                <div className="header-dropdown profile-dropdown">
                                    <div className="dropdown-user-info">
                                        <div className="avatar" style={{ background: '#111111', color: '#ffffff' }}>
                                            {getInitials(user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin' : 'Admin')}
                                        </div>
                                        <div>
                                            <p className="dropdown-user-name">{user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin User' : 'Admin User'}</p>
                                            <p className="dropdown-user-role">Administrator</p>
                                        </div>
                                    </div>
                                    <div className="dropdown-divider" />
                                    <Link to="/admin/profile" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                        My Profile
                                    </Link>
                                    <Link to="/admin/settings" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="3" />
                                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
                                        </svg>
                                        Settings
                                    </Link>
                                    <div className="dropdown-divider" />
                                    <button className="dropdown-item dropdown-item-danger" onClick={handleLogout}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                            <polyline points="16 17 21 12 16 7" />
                                            <line x1="21" y1="12" x2="9" y2="12" />
                                        </svg>
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="admin-content">
                    {children}
                </main>
            </div>
        </div>
    )
}

export default AdminLayout