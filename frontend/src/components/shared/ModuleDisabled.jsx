// frontend/src/components/shared/ModuleDisabled.jsx — Batch 19
//
// Friendly screen shown when an admin lands on a page whose module is
// disabled on their plan. Replaces the generic 403/error overlay.
//
// Usage in a page component:
//   const { isEnabled, isLoading } = useModuleEnabled('reports')
//   if (isLoading) return <PageLoader />
//   if (!isEnabled) return <ModuleDisabled module="Reports" />
//   // ... rest of the page

export default function ModuleDisabled({ module = 'This feature' }) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '60px 24px', textAlign: 'center',
            minHeight: 360,
        }}>
            <div style={{
                width: 64, height: 64,
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.1)',
                color: '#d97706',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28,
                marginBottom: 18,
            }}>🔒</div>

            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
                {module} is not enabled on your plan
            </h2>

            <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 440, lineHeight: 1.55, marginBottom: 18 }}>
                This module isn't currently active on your subscription. To enable it, please contact
                your account manager or upgrade your plan.
            </p>

            <div style={{
                fontSize: 12.5,
                color: 'var(--text-muted)',
                background: 'var(--bg-secondary, #f9fafb)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '8px 14px',
                maxWidth: 440,
            }}>
                💡 Existing data isn't deleted when a module is turned off — re-enable the module
                anytime to pick up where you left off.
            </div>
        </div>
    )
}
