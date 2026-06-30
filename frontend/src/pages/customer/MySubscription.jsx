import { useState, useEffect } from 'react'
import CustomerLayout from '../../components/customer/CustomerLayout'
import Modal from '../../components/shared/Modal'
import { subscriptionService } from '../../services/subscriptionService'
import { membershipService } from '../../services/membershipService'
import { formatDate, formatCurrency, getStatusClass } from '../../utils/helpers'
import './customer.css'

function MySubscription() {
    const [subscriptions, setSubscriptions] = useState([])
    const [availablePlans, setAvailablePlans] = useState([])
    const [loading, setLoading] = useState(true)
    const [upgradeModal, setUpgradeModal] = useState({ open: false, plan: null })
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [subRes, planRes] = await Promise.all([
                    subscriptionService.getAll({ limit: 10 }),
                    membershipService.getAll(),
                ])
                setSubscriptions(subRes.data)
                setAvailablePlans(planRes.data)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchAll()
    }, [])

    const current = subscriptions.find(s => s.status === 'active')

    const daysLeft = current
        ? Math.max(0, Math.ceil((new Date(current.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
        : 0

    const totalDays = current
        ? Math.ceil((new Date(current.endDate) - new Date(current.startDate)) / (1000 * 60 * 60 * 24))
        : 1

    const usedPct = current
        ? Math.round(((totalDays - daysLeft) / totalDays) * 100)
        : 0

    const handleSubscribe = () => {
        setUpgradeModal({ open: false, plan: null })
        setSuccess(true)
        setTimeout(() => setSuccess(false), 4000)
    }

    if (loading) {
        return (
            <CustomerLayout>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                    <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
                </div>
            </CustomerLayout>
        )
    }

    return (
        <CustomerLayout>
            <div className="customer-page">
                <div style={{ marginBottom: 4 }}>
                    <h1 className="page-title">My Subscription</h1>
                    <p className="page-subtitle">Manage your gym membership</p>
                </div>

                {success && (
                    <div className="alert alert-success">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Subscription request submitted! Our team will contact you shortly.
                    </div>
                )}

                {/* Current Subscription */}
                {current ? (
                    <div className="subscription-current-card">
                        <div className="sub-card-top">
                            <div>
                                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                                    Current Plan
                                </p>
                                <p className="sub-plan-name">{current.membership?.name}</p>
                                <p className="sub-plan-price">
                                    {formatCurrency(current.amount)} / {current.membership?.duration}
                                </p>
                            </div>
                            <span className="sub-status-badge">● Active</span>
                        </div>
                        <div className="sub-details-row">
                            {[
                                { label: 'Start Date', value: formatDate(current.startDate) },
                                { label: 'End Date', value: formatDate(current.endDate) },
                                { label: 'Days Remaining', value: `${daysLeft} days` },
                            ].map((d) => (
                                <div key={d.label} className="sub-detail-item">
                                    <label>{d.label}</label>
                                    <p>{d.value}</p>
                                </div>
                            ))}
                        </div>
                        <div className="sub-days-bar">
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                                <span>Progress</span>
                                <span>{usedPct}% used</span>
                            </div>
                            <div className="sub-days-track">
                                <div className="sub-days-fill" style={{ width: `${usedPct}%` }} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>🏋️</div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Active Subscription</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                            Subscribe to a plan below to get started
                        </p>
                    </div>
                )}

                {/* Plan Features */}
                {current?.membership?.features?.length > 0 && (
                    <div className="card">
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Your Plan Includes</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                            {current.membership.features.map((f, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" width="12" height="12">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </div>
                                    <span style={{ color: 'var(--text-secondary)' }}>{f}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Available Plans */}
                <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Available Plans</h2>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
                        Upgrade or switch your membership plan
                    </p>
                    <div className="plans-available-grid">
                        {availablePlans.map((plan) => {
                            const isCurrent = current?.membership?.name === plan.name
                            return (
                                <div key={plan._id}
                                    className={`available-plan-card ${!isCurrent ? 'recommended' : ''}`}>
                                    <p className="avail-plan-name">{plan.name}</p>
                                    <p className="avail-plan-price">{formatCurrency(plan.price)}</p>
                                    <p className="avail-plan-dur">per {plan.duration}</p>
                                    <ul className="avail-plan-features">
                                        {plan.features?.map((f, i) => (
                                            <li key={i} className="avail-plan-feature">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="var(--success)"
                                                    strokeWidth="2.5" width="14" height="14">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        className={`btn w-full ${isCurrent ? 'btn-secondary' : 'btn-primary'}`}
                                        disabled={isCurrent}
                                        onClick={() => setUpgradeModal({ open: true, plan })}
                                    >
                                        {isCurrent ? '✓ Current Plan' : 'Request Plan'}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Subscription History */}
                {subscriptions.length > 0 && (
                    <div className="card" style={{ padding: 0 }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Subscription History</h3>
                        </div>
                        <div className="table-container" style={{ border: 'none' }}>
                            <table>
                                <thead>
                                    <tr><th>Plan</th><th>Start</th><th>End</th><th>Amount</th><th>Status</th></tr>
                                </thead>
                                <tbody>
                                    {subscriptions.map((s) => (
                                        <tr key={s._id}>
                                            <td style={{ fontWeight: 500 }}>{s.membership?.name}</td>
                                            <td style={{ fontSize: 13 }}>{formatDate(s.startDate)}</td>
                                            <td style={{ fontSize: 13 }}>{formatDate(s.endDate)}</td>
                                            <td style={{ fontWeight: 600 }}>{formatCurrency(s.amount)}</td>
                                            <td>
                                                <span className={`badge ${getStatusClass(s.status)}`}>{s.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Subscribe Modal */}
                <Modal
                    isOpen={upgradeModal.open}
                    onClose={() => setUpgradeModal({ open: false, plan: null })}
                    title="Request Plan"
                    footer={
                        <>
                            <button className="btn btn-secondary"
                                onClick={() => setUpgradeModal({ open: false, plan: null })}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSubscribe}>
                                Submit Request
                            </button>
                        </>
                    }
                >
                    {upgradeModal.plan && (
                        <div style={{ textAlign: 'center', padding: '8px 0' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
                            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                                Request {upgradeModal.plan.name}?
                            </p>
                            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>
                                {formatCurrency(upgradeModal.plan.price)}
                            </p>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                Duration: {upgradeModal.plan.duration}
                            </p>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
                                Our team will contact you to confirm and activate the plan.
                            </p>
                        </div>
                    )}
                </Modal>
            </div>
        </CustomerLayout>
    )
}

export default MySubscription