// frontend/src/hooks/useModules.js
// Hook to check which modules are enabled for the current company.
//
// Usage:
//   const { hasModule, modules } = useModules()
//   if (hasModule('reports')) { ... }

import { useAuth } from './useAuth'

export function useModules() {
  const { user } = useAuth()

  // Superadmin has all modules
  if (user?.role === 'superadmin') {
    const allTrue = {
      members: true, attendance: true, payments: true,
      memberships: true, reports: true, tasks: true,
      targets: true, promotions: true, staff: true,
    }
    return { modules: allTrue, hasModule: () => true }
  }

  // company is populated in user object from GET /api/auth/me
  const modules = user?.companyId?.modules || {}

  const hasModule = (name) => Boolean(modules[name])

  return { modules, hasModule }
}
