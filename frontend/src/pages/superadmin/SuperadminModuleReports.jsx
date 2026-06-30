// frontend/src/pages/superadmin/SuperadminModuleReports.jsx — Batch 18
//
// Module-wise analytics. Three sections:
//   1. Module adoption — % of gyms that have each module enabled
//   2. Customers per module — avg customer count among gyms with each module
//   3. Revenue per module — total platform revenue per module
//
// Charts are hand-rolled inline SVG horizontal bar charts. We chose not to
// add Recharts (which the brief assumed was already installed but actually
// isn't) — adding 150KB of dep weight for three tables felt wrong. If the
// guide later asks for fancier interactive charts, swap to Recharts.

import { useState, useEffect } from 'react'
import api from '../../services/api'
import SuperadminLayout from './SuperadminLayout'
import './superadmin.css'

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

// Each module gets its own color for visual scanning. Modules listed in the
// order returned by the backend (which mirrors the canonical schema order).
const MODULE_COLORS = {
    members:     '#10B981',  // teal — primary brand color
    attendance:  '#3b82f6',  // blue
    payments:    '#f59e0b',  // amber
    memberships: '#8b5cf6',  // violet
    reports:     '#06b6d4',  // cyan
    tasks:       '#ec4899',  // pink
    targets:     '#14b8a6',  // teal-2
    promotions:  '#f97316',  // orange
    staff:       '#6366f1',  // indigo
}

export default function SuperadminModuleReports() {
    const [data, setData]       = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError]     = useState('')

    useEffect(() => {
        api.get('/superadmin/module-analytics')
            .then(res => setData(res.data.data))
            .catch(err => setError(err.response?.data?.message || 'Failed to load analytics'))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return (
        <SuperadminLayout title="Module Reports">
            <div className="sa-loading"><div className="spinner" /></div>
        </SuperadminLayout>
    )
    if (error) return (
        <SuperadminLayout title="Module Reports">
            <div className="sa-error">{error}</div>
        </SuperadminLayout>
    )

    return (
        <SuperadminLayout title="Module Reports">
            <div className="sa-page">

                {/* Top summary chip */}
                <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 10,
                        background: 'rgba(16, 185, 129, 0.1)', color: '#10B981',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20,
                    }}>📊</div>
                    <div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                            Total Gyms
                        </p>
                        <p style={{ fontSize: 22, fontWeight: 700 }}>{data.totalCompanies}</p>
                    </div>
                    <div style={{ flex: 1, fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'right', maxWidth: 380 }}>
                        Numbers below are computed across all {data.totalCompanies} gym{data.totalCompanies !== 1 ? 's' : ''} on the platform.
                        Revenue figures count only invoices marked <strong>paid</strong>.
                    </div>
                </div>

                {/* 1. Adoption */}
                <ChartCard
                    title="Module Adoption"
                    subtitle="Percentage of gyms with each module enabled"
                >
                    <BarChart
                        rows={data.modulesAdoption.map(m => ({
                            label:    m.label,
                            module:   m.module,
                            value:    m.percentage,
                            valueText: `${m.percentage}%`,
                            sub:      `${m.enabledGyms} / ${m.totalGyms} gyms`,
                            barMax:   100,
                        }))}
                    />
                </ChartCard>

                {/* 2. Customers per module */}
                <ChartCard
                    title="Customers per Module"
                    subtitle="Average customer count among gyms that have each module enabled"
                >
                    <BarChart
                        rows={data.customersPerModule.map(m => ({
                            label:    m.label,
                            module:   m.module,
                            value:    m.avgCustomers,
                            valueText: m.enabledGyms === 0 ? '—' : `${m.avgCustomers} avg`,
                            sub:      m.enabledGyms === 0
                                ? 'No gyms with this module'
                                : `${m.totalCustomers} customers across ${m.enabledGyms} gym${m.enabledGyms !== 1 ? 's' : ''}`,
                            // Auto-scale bar max to the largest avg — gives the
                            // chart visual range when modules differ a lot.
                            barMax: Math.max(...data.customersPerModule.map(x => x.avgCustomers), 1),
                        }))}
                    />
                </ChartCard>

                {/* 3. Revenue per module */}
                <ChartCard
                    title="Revenue per Module"
                    subtitle="Total platform revenue from paid invoices, broken down by module line items"
                >
                    <BarChart
                        rows={data.revenuePerModule.map(m => ({
                            label:    m.label,
                            module:   m.module,
                            value:    m.revenue,
                            valueText: fmt(m.revenue),
                            sub:      `${m.invoiceCount} invoice line${m.invoiceCount !== 1 ? 's' : ''}`,
                            barMax: Math.max(...data.revenuePerModule.map(x => x.revenue), 1),
                        }))}
                    />
                    <div style={{
                        marginTop: 14, padding: '10px 14px',
                        fontSize: 12.5, color: 'var(--text-muted)',
                        background: 'var(--bg-secondary, #f9fafb)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                    }}>
                        Total revenue: <strong style={{ color: 'var(--text-primary)' }}>
                            {fmt(data.revenuePerModule.reduce((s, m) => s + m.revenue, 0))}
                        </strong>
                    </div>
                </ChartCard>

            </div>
        </SuperadminLayout>
    )
}

// ─── Chart primitives ───────────────────────────────────────────────

function ChartCard({ title, subtitle, children }) {
    return (
        <div className="card">
            <div style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{title}</h3>
                {subtitle && (
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</p>
                )}
            </div>
            {children}
        </div>
    )
}

// Hand-rolled horizontal bar chart. Each row gets its own bar with the
// label on the left, bar in the middle, value on the right.
//
// `rows[].barMax` controls the bar's full-width threshold — pass 100 for
// percentage charts, or a computed max for numeric charts.
function BarChart({ rows }) {
    if (!rows || rows.length === 0) {
        return (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: 12 }}>
                No data to display.
            </p>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map(r => {
                const pct = r.barMax > 0 ? Math.min(100, (r.value / r.barMax) * 100) : 0
                const color = MODULE_COLORS[r.module] || '#10B981'
                return (
                    <div key={r.module} style={{
                        display: 'grid',
                        gridTemplateColumns: '120px 1fr 140px',
                        alignItems: 'center',
                        gap: 12,
                        fontSize: 13,
                    }}>
                        {/* Label */}
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                            {r.label}
                        </div>

                        {/* Bar */}
                        <div style={{
                            height: 24,
                            background: 'var(--bg-secondary, #f4f4f4)',
                            borderRadius: 4,
                            overflow: 'hidden',
                            position: 'relative',
                        }}>
                            <div style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: color,
                                borderRadius: 4,
                                transition: 'width 0.4s ease',
                                minWidth: r.value > 0 ? 2 : 0,
                            }} />
                        </div>

                        {/* Value + sub */}
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {r.valueText}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                                {r.sub}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
