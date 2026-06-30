import { useState, useEffect } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import { companyService } from '../../../services/companyService'
import { customerService } from '../../../services/customerService'
import { membershipService } from '../../../services/membershipService'
import { branchService } from '../../../services/branchService'

function MyBusiness() {
    const [editing, setEditing] = useState(false)
    const [saved, setSaved] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        established: '',
        website: '',
        description: '',
        gstNumber: '',
    })
    const [owner, setOwner] = useState({
        name: '',
        email: '',
        phone: '',
        alternatePhone: '',
        dateOfBirth: '',
        aadhaarLast4: '',
        panNumber: '',
        address: '',
    })
    const [bank, setBank] = useState({
        bankName: '',
        accountNumber: '',
        ifsc: '',
        accountHolderName: '',
        upiId: '',
    })
    const [meta, setMeta] = useState({
        createdAt: null,
        plan: 'trial',
        status: 'trial',
        slug: '',
    })
    const [stats, setStats] = useState({
        totalMembers: 0,
        activePlans: 0,
        branches: 0,
    })

    useEffect(() => {
        const loadAll = async () => {
            try {
                const [companyRes, customersRes, membershipsRes, branchesRes] = await Promise.all([
                    companyService.getMine(),
                    customerService.getAll({ limit: 1 }),
                    membershipService.getAll(),
                    branchService.getAll(),
                ])

                const c = companyRes.data || {}
                setForm({
                    name: c.name || '',
                    email: c.email || '',
                    phone: c.phone || '',
                    address: c.address || '',
                    city: c.city || '',
                    state: c.state || '',
                    established: c.established || '',
                    website: c.website || '',
                    description: c.description || '',
                    gstNumber: c.gstNumber || '',
                })
                setOwner({
                    name:           c.owner?.name || '',
                    email:          c.owner?.email || '',
                    phone:          c.owner?.phone || '',
                    alternatePhone: c.owner?.alternatePhone || '',
                    dateOfBirth:    c.owner?.dateOfBirth ? String(c.owner.dateOfBirth).substring(0, 10) : '',
                    aadhaarLast4:   c.owner?.aadhaarLast4 || '',
                    panNumber:      c.owner?.panNumber || '',
                    address:        c.owner?.address || '',
                })
                setBank({
                    bankName:          c.bankDetails?.bankName || '',
                    accountNumber:     c.bankDetails?.accountNumber || '',
                    ifsc:              c.bankDetails?.ifsc || '',
                    accountHolderName: c.bankDetails?.accountHolderName || '',
                    upiId:             c.bankDetails?.upiId || '',
                })
                setMeta({
                    createdAt: c.createdAt,
                    plan: c.plan || 'trial',
                    status: c.status || 'trial',
                    slug: c.slug || '',
                })
                setStats({
                    totalMembers: customersRes.pagination?.total || 0,
                    activePlans:  (membershipsRes.data || []).length,
                    branches:     (branchesRes.data || []).length,
                })
            } catch (err) {
                console.error('Failed to load business info:', err)
                setError(err.response?.data?.message || 'Failed to load business info')
            } finally {
                setLoading(false)
            }
        }
        loadAll()
    }, [])

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const handleOwnerChange = (e) => {
        setOwner({ ...owner, [e.target.name]: e.target.value })
    }

    const handleBankChange = (e) => {
        setBank({ ...bank, [e.target.name]: e.target.value })
    }

    const handleSave = async () => {
        setSaving(true)
        setError('')
        try {
            const payload = { ...form, owner: { ...owner }, bankDetails: { ...bank } }
            // Empty date string → remove (Mongoose needs Date or undefined, not '')
            if (!payload.owner.dateOfBirth) delete payload.owner.dateOfBirth
            await companyService.updateMine(payload)
            setSaved(true)
            setEditing(false)
            setTimeout(() => setSaved(false), 3000)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save changes')
        } finally {
            setSaving(false)
        }
    }

    const displayAddress = [form.address, form.city, form.state].filter(Boolean).join(', ') || '—'
    const establishedYear = meta.createdAt ? new Date(meta.createdAt).getFullYear() : new Date().getFullYear()
    const yearsRunning = new Date().getFullYear() - establishedYear

    const fields = [
        { label: 'Gym Name',    key: 'name',        icon: '🏋️' },
        { label: 'Email',       key: 'email',       icon: '📧' },
        { label: 'Phone',       key: 'phone',       icon: '📞' },
        { label: 'Website',     key: 'website',     icon: '🌐' },
        { label: 'Address',     key: 'address',     icon: '📍' },
        { label: 'City',        key: 'city',        icon: '🏙️' },
        { label: 'State',       key: 'state',       icon: '🗺️' },
        { label: 'Established', key: 'established', icon: '📅' },
        { label: 'GST Number',  key: 'gstNumber',   icon: '🧾' },
        { label: 'Description', key: 'description', icon: '📝', type: 'textarea', full: true },
    ]

    const ownerFields = [
        { label: 'Owner Name',       key: 'name',           icon: '👤' },
        { label: 'Email',            key: 'email',          icon: '📧', type: 'email' },
        { label: 'Phone',            key: 'phone',          icon: '📞', type: 'tel' },
        { label: 'Alternate Phone',  key: 'alternatePhone', icon: '📱', type: 'tel' },
        { label: 'Date of Birth',    key: 'dateOfBirth',    icon: '🎂', type: 'date' },
        { label: 'Aadhaar (last 4)', key: 'aadhaarLast4',   icon: '🪪' },
        { label: 'PAN Number',       key: 'panNumber',      icon: '🪪' },
        { label: 'Personal Address', key: 'address',        icon: '🏠', full: true },
    ]

    const bankFields = [
        { label: 'Bank Name',           key: 'bankName',          icon: '🏦', placeholder: 'e.g. HDFC Bank' },
        { label: 'Account Holder Name', key: 'accountHolderName', icon: '👤', placeholder: 'As per bank records' },
        { label: 'Account Number',      key: 'accountNumber',     icon: '🔢', placeholder: '12-digit account number' },
        { label: 'IFSC Code',           key: 'ifsc',              icon: '🏷️', placeholder: 'e.g. HDFC0001234' },
        { label: 'UPI ID',              key: 'upiId',             icon: '📲', placeholder: 'e.g. powerhouse@okhdfcbank', full: true },
    ]

    if (loading) {
        return (
            <AdminLayout>
                <div className="page-content">
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
                    </div>
                </div>
            </AdminLayout>
        )
    }

    return (
        <AdminLayout>
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">My Business</h1>
                        <p className="page-subtitle">Manage your gym business details</p>
                    </div>
                    <button
                        className={`btn ${editing ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => setEditing(!editing)}
                    >
                        {editing ? 'Cancel' : (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Edit Details
                            </>
                        )}
                    </button>
                </div>

                {saved && (
                    <div className="alert alert-success" style={{ marginBottom: 20 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Business details saved successfully!
                    </div>
                )}

                {error && (
                    <div className="alert alert-danger" style={{ marginBottom: 20 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {error}
                    </div>
                )}

                {/* Gym profile card */}
                <div className="card" style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: 'var(--radius-xl)',
                            background: '#111111',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 32, flexShrink: 0,
                        }}>
                            🏋️
                        </div>
                        <div>
                            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{form.name || '—'}</h2>
                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
                                {displayAddress}
                            </p>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <span className={`badge ${meta.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                                    {meta.status}
                                </span>
                                <span className="badge badge-info">Plan: {meta.plan}</span>
                                <span className="badge badge-info">Est. {establishedYear}</span>
                            </div>
                        </div>
                    </div>

                    {editing ? (
                        <div>
                            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Edit Business Information</h3>
                            <div className="form-row">
                                {fields.map((item) => (
                                    <div
                                        key={item.key}
                                        className="form-group"
                                        style={item.full ? { gridColumn: '1 / -1' } : undefined}
                                    >
                                        <label className="form-label">{item.icon} {item.label}</label>
                                        {item.type === 'textarea' ? (
                                            <textarea
                                                name={item.key}
                                                className="form-textarea"
                                                rows={3}
                                                value={form[item.key]}
                                                onChange={handleChange}
                                            />
                                        ) : (
                                            <input
                                                name={item.key}
                                                type={item.type || 'text'}
                                                className="form-input"
                                                value={form[item.key]}
                                                onChange={handleChange}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Business Information</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                                {fields.map((item) => (
                                    <div
                                        key={item.key}
                                        style={{
                                            padding: '12px 16px',
                                            background: 'var(--bg-secondary)',
                                            borderRadius: 'var(--radius)',
                                            border: '1px solid var(--border)',
                                            gridColumn: item.full ? '1 / -1' : undefined,
                                        }}
                                    >
                                        <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>
                                            {item.label}
                                        </p>
                                        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                                            {item.icon} {form[item.key] || '—'}
                                        </p>
                                    </div>
                                ))}
                                <div style={{
                                    padding: '12px 16px',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius)',
                                    border: '1px solid var(--border)',
                                    gridColumn: 'span 2',
                                }}>
                                    <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>
                                        URL Slug
                                    </p>
                                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                        {meta.slug}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ─── OWNER INFORMATION ─── */}
                <div className="card" style={{ marginBottom: 20 }}>
                    <div style={{ marginBottom: 18 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Owner Information</h3>
                        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                            Personal contact details of the gym owner
                        </p>
                    </div>

                    {editing ? (
                        <div className="form-row">
                            {ownerFields.map((item) => (
                                <div
                                    key={item.key}
                                    className="form-group"
                                    style={item.full ? { gridColumn: '1 / -1' } : undefined}
                                >
                                    <label className="form-label">{item.icon} {item.label}</label>
                                    <input
                                        name={item.key}
                                        type={item.type || 'text'}
                                        className="form-input"
                                        value={owner[item.key]}
                                        onChange={handleOwnerChange}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                            {ownerFields.map((item) => (
                                <div
                                    key={item.key}
                                    style={{
                                        padding: '12px 16px',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius)',
                                        border: '1px solid var(--border)',
                                        gridColumn: item.full ? '1 / -1' : undefined,
                                    }}
                                >
                                    <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>
                                        {item.label}
                                    </p>
                                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                                        {item.icon} {owner[item.key] || '—'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ─── PAYMENT SETUP (Bank + UPI) ─── */}
                <div className="card" style={{ marginBottom: 20 }}>
                    <div style={{ marginBottom: 18 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Payment Setup</h3>
                        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                            Bank account and UPI details. The UPI ID is used to generate a QR code customers can scan to pay you.
                        </p>
                    </div>

                    {editing ? (
                        <div className="form-row">
                            {bankFields.map((item) => (
                                <div
                                    key={item.key}
                                    className="form-group"
                                    style={item.full ? { gridColumn: '1 / -1' } : undefined}
                                >
                                    <label className="form-label">{item.icon} {item.label}</label>
                                    <input
                                        name={item.key}
                                        type="text"
                                        className="form-input"
                                        placeholder={item.placeholder || ''}
                                        value={bank[item.key]}
                                        onChange={handleBankChange}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                            {bankFields.map((item) => (
                                <div
                                    key={item.key}
                                    style={{
                                        padding: '12px 16px',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius)',
                                        border: '1px solid var(--border)',
                                        gridColumn: item.full ? '1 / -1' : undefined,
                                    }}
                                >
                                    <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>
                                        {item.label}
                                    </p>
                                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                                        {item.icon} {bank[item.key] || '—'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {!editing && !bank.upiId && (
                        <div style={{
                            marginTop: 14, padding: '10px 14px',
                            background: '#fffbeb', border: '1px solid #fde68a',
                            borderRadius: 'var(--radius)',
                            fontSize: 13, color: '#92400e',
                        }}>
                            ⚠️ Add a UPI ID to enable QR code payments for your members.
                        </div>
                    )}
                </div>

                {/* Single save button that persists BOTH gym + owner info */}
                {editing && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 20 }}>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setEditing(false)}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving
                                ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                : 'Save Changes'
                            }
                        </button>
                    </div>
                )}

                {/* Quick stats — real numbers from the API */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {[
                        { label: 'Total Members', value: stats.totalMembers, icon: '👥', color: '#f2f2f2', iconBg: '#2b2b2b' },
                        { label: 'Active Plans',  value: stats.activePlans,  icon: '📋', color: '#f0fdf4', iconBg: '#16a34a' },
                        { label: 'Years Running', value: Math.max(0, yearsRunning), icon: '🏆', color: '#f8f8f8', iconBg: '#404040' },
                        { label: 'Branches',      value: stats.branches,     icon: '🏢', color: '#fef3e8', iconBg: '#c05b10' },
                    ].map((s) => (
                        <div key={s.label} style={{
                            background: s.color, borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border)', padding: 20,
                            display: 'flex', alignItems: 'center', gap: 14,
                        }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 'var(--radius-md)',
                                background: s.iconBg, color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                            }}>
                                {s.icon}
                            </div>
                            <div>
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3 }}>{s.label}</p>
                                <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AdminLayout>
    )
}

export default MyBusiness
