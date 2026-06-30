// frontend/src/pages/admin/settings/Settings.jsx — Batch 22
//
// Replaces the placeholder Settings page that hardcoded "FitSync Gym" /
// "John Admin" / etc. The General tab now:
//   1. Fetches the logged-in admin's real company on mount
//   2. Lets them edit name/owner/phone/address and persists via PUT /companies/me
//   3. Supports logo upload (POST /companies/me/logo) with preview + remove
//
// Tabs other than General are kept as visible-but-disabled placeholders.
// Wiring them would require new schema fields and endpoints (SMTP creds,
// S3 keys, social links) that aren't in scope here. Showing them with a
// "coming soon" notice is more honest than letting them pretend to save.

import { useState, useEffect, useRef } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import { companyService } from '../../../services/companyService'
import { useToast } from '../../../context/ToastContext'
import './settings.css'

const tabs = [
    { key: 'general',    label: 'General',     ready: true  },
    { key: 'mail',       label: 'Mail',        ready: false },
    { key: 'fileupload', label: 'File Upload', ready: false },
    { key: 'others',     label: 'Others',      ready: false },
    { key: 'footer',     label: 'Footer',      ready: false },
]

// Build an absolute URL for the logo if the server returned a relative path.
// The /uploads static mount lives on the backend (port 5000 in dev) but the
// frontend runs on 5173 — relative URLs would 404 against vite's dev server.
const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const resolveLogoUrl = (logo) => {
    if (!logo) return null
    if (logo.startsWith('http://') || logo.startsWith('https://')) return logo
    return `${apiBase.replace(/\/api\/?$/, '')}${logo}`
}

function Settings() {
    const toast = useToast()
    const [activeTab, setActiveTab] = useState('general')

    // Server-side state
    const [company, setCompany]   = useState(null)   // raw company doc
    const [loading, setLoading]   = useState(true)
    const [loadError, setLoadError] = useState('')

    // Form state for the General tab
    const [form, setForm] = useState({
        name: '', ownerName: '', phone: '', address: '', city: '', state: '',
        email: '', website: '', gstNumber: '',
    })
    const [saving, setSaving] = useState(false)

    // Logo upload state
    const fileInputRef = useRef(null)
    const [uploadingLogo, setUploadingLogo] = useState(false)

    // Initial fetch
    useEffect(() => {
        let cancelled = false
        companyService.getMine()
            .then(res => {
                if (cancelled) return
                const c = res.data
                setCompany(c)
                setForm({
                    name:        c.name        || '',
                    ownerName:   c.owner?.name || '',
                    phone:       c.phone       || '',
                    address:     c.address     || '',
                    city:        c.city        || '',
                    state:       c.state       || '',
                    email:       c.email       || '',
                    website:     c.website     || '',
                    gstNumber:   c.gstNumber   || '',
                })
            })
            .catch(err => {
                if (cancelled) return
                setLoadError(err.response?.data?.message || 'Could not load company settings.')
            })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [])

    const handleChange = (key) => (e) => {
        setForm(f => ({ ...f, [key]: e.target.value }))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            // Map flat form back to the nested Company shape. ownerName lives
            // on Company.owner.name; we merge so we don't accidentally clobber
            // other owner sub-fields (DOB, PAN, etc.) the seed populated.
            const payload = {
                name: form.name.trim(),
                phone: form.phone.trim(),
                address: form.address.trim(),
                city: form.city.trim(),
                state: form.state.trim(),
                email: form.email.trim(),
                website: form.website.trim(),
                gstNumber: form.gstNumber.trim(),
                owner: {
                    ...(company?.owner || {}),
                    name: form.ownerName.trim(),
                },
            }
            const res = await companyService.updateMine(payload)
            setCompany(res.data)
            toast.success('Settings saved')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not save settings.')
        } finally {
            setSaving(false)
        }
    }

    const handleLogoSelect = () => {
        fileInputRef.current?.click()
    }

    const handleLogoChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Frontend-side validation — backend re-validates anyway, but a fast
        // bounce is better UX than a round-trip just to show an error.
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be 2MB or smaller.')
            e.target.value = ''
            return
        }
        const okTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
        if (!okTypes.includes(file.type)) {
            toast.error('Only JPG, PNG, SVG, or WebP images are allowed.')
            e.target.value = ''
            return
        }

        setUploadingLogo(true)
        try {
            const res = await companyService.uploadLogo(file)
            setCompany(res.data)
            toast.success('Logo updated')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not upload logo.')
        } finally {
            setUploadingLogo(false)
            // Reset the input so the user can re-select the SAME file later.
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleLogoRemove = async () => {
        if (!confirm('Remove the gym logo?')) return
        setUploadingLogo(true)
        try {
            const res = await companyService.removeLogo()
            setCompany(res.data)
            toast.success('Logo removed')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not remove logo.')
        } finally {
            setUploadingLogo(false)
        }
    }

    if (loading) {
        return (
            <AdminLayout>
                <div className="page-content" style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
                    <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
                </div>
            </AdminLayout>
        )
    }

    if (loadError) {
        return (
            <AdminLayout>
                <div className="page-content">
                    <div className="alert alert-danger" style={{ marginTop: 24 }}>
                        {loadError}
                    </div>
                </div>
            </AdminLayout>
        )
    }

    const logoUrl = resolveLogoUrl(company?.logo)

    return (
        <AdminLayout>
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Settings</h1>
                        <p className="page-subtitle">Configure your gym management system</p>
                    </div>
                </div>

                <div className="settings-layout">
                    {/* Sidebar Tabs */}
                    <div className="settings-sidebar">
                        {tabs.map((t) => (
                            <button
                                key={t.key}
                                className={`settings-tab-btn ${activeTab === t.key ? 'active' : ''}`}
                                onClick={() => setActiveTab(t.key)}
                            >
                                {t.label}
                                {!t.ready && (
                                    <span style={{
                                        fontSize: 10, fontWeight: 500, marginLeft: 6,
                                        padding: '1px 6px', borderRadius: 8,
                                        background: '#f3f4f6', color: '#6b7280',
                                    }}>SOON</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="settings-content">
                        {activeTab === 'general' && (
                            <div className="card">
                                <h2 className="settings-section-title">General Settings</h2>
                                <p className="settings-section-sub">Update your gym profile and branding</p>

                                {/* Logo */}
                                <div className="settings-upload-area" style={{ marginTop: 16 }}>
                                    <div className="settings-logo-preview" style={{
                                        width: 80, height: 80, borderRadius: 8,
                                        background: logoUrl ? '#fff' : '#f3f4f6',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        overflow: 'hidden', border: '1px solid var(--border)',
                                    }}>
                                        {logoUrl ? (
                                            <img src={logoUrl} alt="Gym logo"
                                                 style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                        ) : (
                                            <span style={{ fontSize: 32 }} role="img" aria-label="No logo">🏋</span>
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Gym Logo</h4>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                onClick={handleLogoSelect}
                                                disabled={uploadingLogo}
                                            >
                                                {uploadingLogo ? 'Uploading…' : (logoUrl ? 'Replace Logo' : 'Upload Logo')}
                                            </button>
                                            {logoUrl && (
                                                <button
                                                    type="button"
                                                    className="btn btn-sm"
                                                    onClick={handleLogoRemove}
                                                    disabled={uploadingLogo}
                                                    style={{ color: '#dc2626', background: 'transparent', border: '1px solid #fca5a5' }}
                                                >
                                                    Remove
                                                </button>
                                            )}
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/svg+xml,image/webp"
                                                onChange={handleLogoChange}
                                                style={{ display: 'none' }}
                                            />
                                        </div>
                                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                            JPG, PNG, SVG, or WebP — up to 2MB
                                        </p>
                                    </div>
                                </div>

                                {/* Form fields */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginTop: 20 }}>
                                    <div className="form-group">
                                        <label className="form-label">Gym Name</label>
                                        <input className="form-input" value={form.name} onChange={handleChange('name')} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Owner Name</label>
                                        <input className="form-input" value={form.ownerName} onChange={handleChange('ownerName')} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Phone</label>
                                        <input className="form-input" value={form.phone} onChange={handleChange('phone')} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input className="form-input" type="email" value={form.email} onChange={handleChange('email')} />
                                    </div>
                                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">Address</label>
                                        <input className="form-input" value={form.address} onChange={handleChange('address')} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">City</label>
                                        <input className="form-input" value={form.city} onChange={handleChange('city')} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">State</label>
                                        <input className="form-input" value={form.state} onChange={handleChange('state')} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Website</label>
                                        <input className="form-input" placeholder="https://" value={form.website} onChange={handleChange('website')} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">GST Number</label>
                                        <input className="form-input" value={form.gstNumber} onChange={handleChange('gstNumber')} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
                                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                        {saving ? 'Saving…' : 'Save Settings'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab !== 'general' && (
                            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                                <div style={{ fontSize: 36, marginBottom: 8 }}>🚧</div>
                                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                                    {tabs.find(t => t.key === activeTab)?.label} settings — coming soon
                                </h3>
                                <p style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto' }}>
                                    This section will be available in a future release. The General tab is the
                                    only one wired to a backend right now.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}

export default Settings
