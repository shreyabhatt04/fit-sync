import { useState } from 'react'
import CustomerLayout from '../../components/customer/CustomerLayout'
import { useAuth } from '../../hooks/useAuth'
import { authService } from '../../services/authService'
import { getInitials } from '../../utils/helpers'
import './customer.css'

function CustomerProfile() {
    const { user, login, token } = useAuth()
    const [form, setForm] = useState({
        firstName: user?.firstName || (user?.name || '').split(' ')[0] || '',
        lastName:  user?.lastName  || (user?.name || '').split(' ').slice(1).join(' ') || '',
        phone: user?.phone || '',
    })
    const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' })
    const [saved, setSaved] = useState(false)
    const [saving, setSaving] = useState(false)
    const [passSaved, setPassSaved] = useState(false)
    const [passError, setPassError] = useState('')
    const [passLoading, setPassLoading] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await authService.updateProfile({
                firstName: form.firstName.trim(),
                lastName:  form.lastName.trim(),
                phone:     form.phone,
            })
            const fresh = res.data || {}
            const computedName = `${fresh.firstName || form.firstName} ${fresh.lastName || form.lastName}`.trim()
            login({ ...user, ...fresh, name: computedName }, token)
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (err) {
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    const handleChangePass = async () => {
        setPassError('')
        if (!passwords.current) { setPassError('Enter current password'); return }
        if (passwords.newPass.length < 6) { setPassError('Minimum 6 characters'); return }
        if (passwords.newPass !== passwords.confirm) { setPassError('Passwords do not match'); return }
        setPassLoading(true)
        try {
            await authService.changePassword({
                currentPassword: passwords.current,
                newPassword: passwords.newPass,
            })
            setPassSaved(true)
            setPasswords({ current: '', newPass: '', confirm: '' })
            setTimeout(() => setPassSaved(false), 3000)
        } catch (err) {
            setPassError(err.response?.data?.message || 'Failed to change password')
        } finally {
            setPassLoading(false)
        }
    }

    return (
        <CustomerLayout>
            <div className="customer-page">
                <div style={{ marginBottom: 4 }}>
                    <h1 className="page-title">My Profile</h1>
                    <p className="page-subtitle">Manage your personal information</p>
                </div>

                {/* Profile Header */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: '50%',
                            background: '#16a34a', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 28, fontWeight: 700, flexShrink: 0,
                        }}>
                            {getInitials(user?.name || 'Member')}
                        </div>
                        <div>
                            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{user?.name}</h2>
                            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                                Gym Member · {user?.email}
                            </p>
                        </div>
                    </div>

                    {saved && (
                        <div className="alert alert-success" style={{ marginBottom: 16 }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Profile updated successfully!
                        </div>
                    )}

                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
                        Personal Information
                    </h3>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">First Name</label>
                            <input className="form-input" value={form.firstName}
                                onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Last Name</label>
                            <input className="form-input" value={form.lastName}
                                onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input type="email" className="form-input" value={user?.email} disabled
                                style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone Number</label>
                            <input className="form-input" value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <input className="form-input" value="Gym Member" disabled
                                style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            {saving
                                ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                : 'Save Profile'
                            }
                        </button>
                    </div>
                </div>

                {/* Change Password */}
                <div className="card">
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Change Password</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                        Keep your account secure with a strong password
                    </p>

                    {passError && (
                        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            {passError}
                        </div>
                    )}

                    {passSaved && (
                        <div className="alert alert-success" style={{ marginBottom: 16 }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Password changed!
                        </div>
                    )}

                    <div style={{ maxWidth: 400 }}>
                        {[
                            { key: 'current', label: 'Current Password', placeholder: 'Enter current password' },
                            { key: 'newPass', label: 'New Password', placeholder: 'Min 6 characters' },
                            { key: 'confirm', label: 'Confirm New Password', placeholder: 'Confirm password' },
                        ].map((f) => (
                            <div key={f.key} className="form-group">
                                <label className="form-label">{f.label}</label>
                                <input type="password" className="form-input" placeholder={f.placeholder}
                                    value={passwords[f.key]}
                                    onChange={(e) => setPasswords({ ...passwords, [f.key]: e.target.value })} />
                            </div>
                        ))}
                        <button className="btn btn-primary" onClick={handleChangePass} disabled={passLoading}>
                            {passLoading
                                ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                : 'Update Password'
                            }
                        </button>
                    </div>
                </div>
            </div>
        </CustomerLayout>
    )
}

export default CustomerProfile