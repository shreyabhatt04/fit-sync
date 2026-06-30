// frontend/src/hooks/useModuleEnabled.js — Batch 19 (guide feedback #12)
//
// Tiny hook for module-gated pages. Returns whether the given module is
// enabled on the current user's company plan, plus a loading flag for the
// brief moment between mount and AuthContext hydration.
//
// Usage:
//   const { isEnabled, isLoading } = useModuleEnabled('reports')
//   if (isLoading) return <Loading />
//   if (!isEnabled) return <ModuleDisabled module="Reports" />
//   // ... render the page normally
//
// Why a hook (vs reading user.companyId.modules directly):
//   - One canonical place if we ever change the shape of the auth payload
//   - Defaults gracefully when companyId hasn't populated yet (during the
//     login → /auth/me round-trip, user is set but company.modules may not be)
//   - Superadmins see every module as enabled, matching the backend guard

import { useAuth } from './useAuth'

export function useModuleEnabled(moduleName) {
    const { user, loading } = useAuth()

    // Superadmins bypass module gating — same as backend moduleGuard.
    if (user?.role === 'superadmin') {
        return { isEnabled: true, isLoading: false }
    }

    // Until /auth/me has hydrated companyId.modules, fall back to "loading".
    // We treat "user exists but companyId not populated" as still loading
    // rather than disabled — otherwise the page flashes a Disabled screen
    // for a few hundred ms before the real modules object arrives.
    const company = user?.companyId
    if (loading || (user && !company)) {
        return { isEnabled: false, isLoading: true }
    }

    const isEnabled = !!company?.modules?.[moduleName]
    return { isEnabled, isLoading: false }
}
