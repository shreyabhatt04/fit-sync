// frontend/src/components/ModuleGuard.jsx
// Wraps any page/section and hides it if the module isn't enabled.
// Shows an "Upgrade" prompt instead.
//
// Usage:
//   <ModuleGuard module="reports">
//     <Reports />
//   </ModuleGuard>

import { useAuth } from '../hooks/useAuth'
import { Link }    from 'react-router-dom'
import './ModuleGuard.css'

export default function ModuleGuard({ module: moduleName, children }) {
  const { user } = useAuth()

  // Superadmin always has access
  if (user?.role === 'superadmin') return children

  // Get modules from the company object (populated in getMe → stored in auth context)
  const company = user?.companyId  // populated with .populate('companyId') in getMe
  const modules = company?.modules || {}

  // If module is enabled, render children normally
  if (modules[moduleName]) return children

  // Otherwise show upgrade prompt
  return (
    <div className="module-locked">
      <div className="module-locked-icon">🔒</div>
      <h2 className="module-locked-title">Module Not Enabled</h2>
      <p className="module-locked-desc">
        The <strong>{moduleName}</strong> module is not active on your current plan.
        Upgrade your subscription to unlock it.
      </p>
      <Link to="/subscribe" className="btn btn-primary">
        Upgrade Plan
      </Link>
    </div>
  )
}
