import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { notificationService } from '../../services/notificationService'
import { getInitials } from '../../utils/helpers'
import './CustomerLayout.css'

const menuItems = [
  {
    label: 'My Menu',
    items: [
      {
        label: 'Dashboard', path: '/customer/dashboard', icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        )
      },
      {
        label: 'My Subscription', path: '/customer/subscription', icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        )
      },
      {
        label: 'Attendance', path: '/customer/attendance', icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        )
      },
      {
        label: 'Payments', path: '/customer/payments', icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
        )
      },
      {
        label: 'Messages', path: '/customer/messages', icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )
      },
    ],
  },
  {
    label: 'Account',
    items: [
      {
        label: 'My Profile', path: '/customer/profile', icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )
      },
    ],
  },
]

function CustomerLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const profileRef = useRef(null)
  const notifRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Poll notifications. Same pattern as AdminLayout.
  useEffect(() => {
    let cancelled = false
    const fetchNotifs = async () => {
      try {
        const res = await notificationService.getMine()
        if (cancelled) return
        setNotifications(res.data || [])
        setUnreadCount(res.unreadCount || 0)
      } catch (err) {
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
    for (const group of menuItems) {
      for (const item of group.items) {
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
    <div className={`customer-layout-sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${sidebarOpen ? 'mobile-sidebar-open' : ''}`}>

      {/* Sidebar */}
      <aside className="customer-sidebar">
        {/* Logo */}
        <div className="customer-sidebar-logo">
          <div className="customer-logo-icon">
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
          {!collapsed && <span className="customer-logo-text">FitSync</span>}
        </div>

        {/* Member Info */}
        {!collapsed && (
          <div className="customer-sidebar-member">
            <div className="customer-member-avatar">
              {getInitials(user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Member' : 'Member')}
            </div>
            <div className="customer-member-info">
              <p className="customer-member-name">{user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Member' : 'Member'}</p>
              <span className="customer-member-badge">Premium Member</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="customer-sidebar-nav">
          {menuItems.map((group) => (
            <div key={group.label} className="customer-sidebar-group">
              {!collapsed && (
                <p className="customer-sidebar-group-label">{group.label}</p>
              )}
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`customer-sidebar-item ${isActive(item.path) ? 'active' : ''}`}
                  title={collapsed ? item.label : ''}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="customer-sidebar-item-icon">{item.icon}</span>
                  {!collapsed && (
                    <span className="customer-sidebar-item-label">{item.label}</span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Collapse Button */}
        <button
          className="customer-sidebar-collapse"
          onClick={() => setCollapsed(!collapsed)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {collapsed
              ? <polyline points="9 18 15 12 9 6" />
              : <polyline points="15 18 9 12 15 6" />
            }
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
      <div className="customer-main">
        {/* Header */}
        <header className="customer-header">
          <div className="customer-header-left">
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
            <h1 className="customer-header-title">{getCurrentPageTitle()}</h1>
          </div>
          <div className="customer-header-right">
            {/* Notifications */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                className="customer-header-icon-btn"
                onClick={() => setNotifOpen(!notifOpen)}
                style={{ position: 'relative' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: 4, right: 4,
                    minWidth: 16, height: 16,
                    padding: '0 4px',
                    background: '#ef4444', color: '#fff',
                    borderRadius: 8,
                    fontSize: 10, fontWeight: 700, lineHeight: '16px',
                    textAlign: 'center',
                    border: '2px solid var(--bg-primary, #fff)',
                  }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>
              {notifOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  width: 360, maxWidth: 'calc(100vw - 32px)',
                  background: 'var(--bg-primary, #fff)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg, 10px)',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                  zIndex: 1000,
                  maxHeight: 'min(70vh, 480px)',
                  overflowY: 'auto',
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border)',
                    fontWeight: 600,
                  }}>
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
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>0 new</span>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px 16px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.slice(0, 8).map((n) => (
                      <div
                        key={n._id}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--border)',
                          background: !n.read ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                          borderLeft: n.daysOut === 1 ? '3px solid #ef4444' : '3px solid transparent',
                        }}
                      >
                        <p style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, marginBottom: 2 }}>
                          {n.title}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 4px' }}>
                          {n.message}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {relTime(n.createdAt)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="customer-header-profile-wrapper" ref={profileRef}>
              <button
                className="customer-header-profile-btn"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <div className="customer-header-avatar">
                  {getInitials(user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Member' : 'Member')}
                </div>
                <span className="customer-header-username">{user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Member' : 'Member'}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {profileOpen && (
                <div className="customer-profile-dropdown">
                  <div className="customer-dropdown-user">
                    <div className="customer-dropdown-avatar">
                      {getInitials(user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Member' : 'Member')}
                    </div>
                    <div>
                      <p className="customer-dropdown-name">{user?.name}</p>
                      <p className="customer-dropdown-role">Gym Member</p>
                    </div>
                  </div>
                  <div className="customer-dropdown-divider" />
                  <Link to="/customer/profile" className="customer-dropdown-item"
                    onClick={() => setProfileOpen(false)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    My Profile
                  </Link>
                  <div className="customer-dropdown-divider" />
                  <button className="customer-dropdown-item customer-dropdown-danger"
                    onClick={handleLogout}>
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

        {/* Content */}
        <main className="customer-content">
          {children}
        </main>
      </div>
    </div>
  )
}

export default CustomerLayout