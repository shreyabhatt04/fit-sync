import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import './superadmin.css'

const NAV = [
  { to: '/superadmin/dashboard',    label: 'Dashboard',     icon: '▦' },
  { to: '/superadmin/companies',    label: 'Gyms',          icon: '🏋️' },
  { to: '/superadmin/users',        label: 'Users',         icon: '👥' },
  { to: '/superadmin/pending-approvals', label: 'Pending Approvals', icon: '⏳' },
  { to: '/superadmin/subscriptions',label: 'Subscriptions', icon: '💳' },
  { to: '/superadmin/billing',      label: 'Billing',       icon: '🧾' },
  { to: '/superadmin/module-reports', label: 'Module Reports', icon: '📊' },
  { to: '/superadmin/pricing',      label: 'Pricing',       icon: '₹' },
]

export default function SuperadminLayout({ children, title }) {
  const { logout } = useAuth()
  const navigate   = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className={`sa-layout ${collapsed ? 'sa-collapsed' : ''} ${sidebarOpen ? 'mobile-sidebar-open' : ''}`}>

      {/* Sidebar */}
      <aside className="sa-sidebar">
        <div className="sa-sidebar-logo" onClick={() => setCollapsed(!collapsed)}>
          <div className="sa-sidebar-icon">
            <svg viewBox="0 0 48 48" fill="currentColor" width="18" height="18">
              <rect x="4"  y="19" width="6"  height="10" rx="2" opacity="0.9" />
              <rect x="10" y="14" width="5"  height="20" rx="2.5" />
              <rect x="15" y="17" width="4"  height="14" rx="2"   opacity="0.85" />
              <rect x="19" y="21" width="10" height="6"  rx="3" />
              <rect x="29" y="17" width="4"  height="14" rx="2"   opacity="0.85" />
              <rect x="33" y="14" width="5"  height="20" rx="2.5" />
              <rect x="38" y="19" width="6"  height="10" rx="2"   opacity="0.9" />
            </svg>
          </div>
          {!collapsed && <span className="sa-sidebar-brand">FitSync SA</span>}
        </div>

        <nav className="sa-sidebar-nav">
          <p className="sa-sidebar-section">{!collapsed && 'MENU'}</p>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sa-sidebar-item ${isActive ? 'sa-sidebar-item--active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sa-sidebar-item-icon">{item.icon}</span>
              {!collapsed && <span className="sa-sidebar-item-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sa-sidebar-footer">
          <button className="sa-sidebar-logout" onClick={handleLogout}>
            <span>↩</span>
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main */}
      <div className="sa-main">
        <header className="sa-header">
          <div className="sa-header-left">
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
            <h1 className="sa-header-title">{title || 'Superadmin'}</h1>
          </div>
          <div className="sa-header-right">
            <div className="sa-header-badge">SUPERADMIN</div>
          </div>
        </header>
        <main className="sa-content">
          {children}
        </main>
      </div>

    </div>
  )
}
