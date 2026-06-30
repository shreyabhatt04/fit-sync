import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AdminLayout from '../../../components/admin/AdminLayout'
import { customerService } from '../../../services/customerService'
import { gymStaffService } from '../../../services/gymStaffService'
import './customers.css'

// ─── Batch 9c — guide feedback #4 ──────────────────────────────
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed']

// Per guide: State dropdown shows Gujarat only (single-state app for now)
const STATES = ['Gujarat']

// Top Gujarat cities — city dropdown is driven by selected state
const CITIES_BY_STATE = {
    Gujarat: [
        'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar',
        'Gandhinagar', 'Anand', 'Junagadh', 'Nadiad', 'Morbi', 'Surendranagar',
        'Bharuch', 'Mehsana', 'Palanpur', 'Navsari', 'Valsad', 'Vapi',
        'Porbandar', 'Gandhidham', 'Bhuj', 'Patan', 'Godhra', 'Himatnagar',
        'Botad', 'Dahod', 'Veraval', 'Amreli', 'Deesa', 'Mandvi',
        'Khambhat', 'Kadi', 'Kalol', 'Savarkundla', 'Upleta',
    ],
}

function AddCustomer() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const editId = searchParams.get('edit') // e.g. ?edit=64abc...

    const [form, setForm] = useState({
        firstName: '', lastName: '', email: '', phone: '',
        dateOfBirth: '', gender: '',
        bloodGroup: '', maritalStatus: '', anniversary: '',
        address: '', state: 'Gujarat', city: '',
        emergencyContactName: '', emergencyContactPhone: '', healthNotes: '',
        assignedTrainer: '',
    })
    const [trainers, setTrainers] = useState([])
    const [errors, setErrors] = useState({})
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(!!editId) // show loader while fetching existing data
    const [apiError, setApiError] = useState('')

    // If editId is present, fetch existing customer and pre-fill the form
    useEffect(() => {
        // Always fetch trainers list for the dropdown (best-effort)
        gymStaffService.getTrainers()
            .then(res => setTrainers(res.data || []))
            .catch(() => setTrainers([]))

        if (!editId) return
        const fetchCustomer = async () => {
            try {
                const res = await customerService.getById(editId)
                const c = res.data
                setForm({
                    firstName: c.firstName || '',
                    lastName: c.lastName || '',
                    email: c.email || '',
                    phone: c.phone || '',
                    dateOfBirth: c.dateOfBirth ? c.dateOfBirth.split('T')[0] : '',
                    gender: c.gender || '',
                    bloodGroup: c.bloodGroup || '',
                    maritalStatus: c.maritalStatus || '',
                    anniversary: c.anniversary ? c.anniversary.split('T')[0] : '',
                    address: c.address || '',
                    state: c.state || 'Gujarat',
                    city: c.city || '',
                    emergencyContactName: c.emergencyContact?.name || '',
                    emergencyContactPhone: c.emergencyContact?.phone || '',
                    healthNotes: c.healthNotes || '',
                    assignedTrainer: c.assignedTrainer?._id || c.assignedTrainer || '',
                })
            } catch (err) {
                setApiError('Failed to load customer data')
            } finally {
                setLoading(false)
            }
        }
        fetchCustomer()
    }, [editId])

    const handleChange = (e) => {
        const { name, value } = e.target
        // When state changes, reset city since it's driven by state
        if (name === 'state') {
            setForm({ ...form, state: value, city: '' })
        } else {
            setForm({ ...form, [name]: value })
        }
        setErrors({ ...errors, [name]: '' })
        setApiError('')
    }

    const validate = () => {
        const e = {}
        if (!form.firstName.trim()) e.firstName = 'First name is required'
        if (!form.lastName.trim()) e.lastName = 'Last name is required'
        if (!form.email.trim()) e.email = 'Email is required'
        if (!form.phone.trim()) e.phone = 'Phone is required'
        if (!form.gender) e.gender = 'Gender is required'
        return e
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length > 0) { setErrors(errs); return }
        setSaving(true)
        try {
            const payload = {
                ...form,
                emergencyContact: {
                    name: form.emergencyContactName,
                    phone: form.emergencyContactPhone,
                },
            }
            // Clean up date fields — Mongoose expects Date or undefined, not ''
            if (!payload.anniversary)  delete payload.anniversary
            if (!payload.dateOfBirth)  delete payload.dateOfBirth
            // Empty trainer string → null (so Mongoose ObjectId field clears)
            if (!payload.assignedTrainer) payload.assignedTrainer = null

            if (editId) {
                // UPDATE existing customer
                await customerService.update(editId, payload)
            } else {
                // CREATE new customer
                await customerService.create(payload)
            }

            navigate('/admin/customers')
        } catch (err) {
            setApiError(err.response?.data?.message || 'Failed to save customer')
        } finally {
            setSaving(false)
        }
    }

    const isEditMode = !!editId

    if (loading) {
        return (
            <AdminLayout>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                    <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
                </div>
            </AdminLayout>
        )
    }

    return (
        <AdminLayout>
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <button className="btn btn-secondary btn-sm" style={{ marginBottom: 8 }}
                            onClick={() => navigate('/admin/customers')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                            Back
                        </button>
                        <h1 className="page-title">{isEditMode ? 'Edit Customer' : 'Add New Customer'}</h1>
                        <p className="page-subtitle">{isEditMode ? 'Update member information' : 'Register a new gym member'}</p>
                    </div>
                </div>

                {apiError && (
                    <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {apiError}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="card" style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Personal Information</h3>
                        <div className="add-customer-grid">
                            <div className="form-group">
                                <label className="form-label">First Name *</label>
                                <input name="firstName" className={`form-input ${errors.firstName ? 'input-error' : ''}`}
                                    placeholder="First name" value={form.firstName} onChange={handleChange} />
                                {errors.firstName && <p className="form-error">{errors.firstName}</p>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name *</label>
                                <input name="lastName" className={`form-input ${errors.lastName ? 'input-error' : ''}`}
                                    placeholder="Last name" value={form.lastName} onChange={handleChange} />
                                {errors.lastName && <p className="form-error">{errors.lastName}</p>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input name="email" type="email" className={`form-input ${errors.email ? 'input-error' : ''}`}
                                    placeholder="email@example.com" value={form.email} onChange={handleChange} />
                                {errors.email && <p className="form-error">{errors.email}</p>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone *</label>
                                <input name="phone" className={`form-input ${errors.phone ? 'input-error' : ''}`}
                                    placeholder="10-digit number" value={form.phone} onChange={handleChange} />
                                {errors.phone && <p className="form-error">{errors.phone}</p>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date of Birth</label>
                                <input name="dateOfBirth" type="date" className="form-input"
                                    value={form.dateOfBirth} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Gender *</label>
                                <select name="gender" className={`form-select ${errors.gender ? 'input-error' : ''}`}
                                    value={form.gender} onChange={handleChange}>
                                    <option value="">Select gender</option>
                                    <option>Male</option><option>Female</option><option>Other</option>
                                </select>
                                {errors.gender && <p className="form-error">{errors.gender}</p>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Blood Group</label>
                                <select name="bloodGroup" className="form-select"
                                    value={form.bloodGroup} onChange={handleChange}>
                                    <option value="">Select blood group</option>
                                    {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Marital Status</label>
                                <select name="maritalStatus" className="form-select"
                                    value={form.maritalStatus} onChange={handleChange}>
                                    <option value="">Select status</option>
                                    {MARITAL_STATUSES.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Anniversary Date</label>
                                <input name="anniversary" type="date" className="form-input"
                                    value={form.anniversary} onChange={handleChange}
                                    disabled={form.maritalStatus !== 'Married'}
                                    title={form.maritalStatus !== 'Married' ? 'Only available for married members' : ''} />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Address</label>
                                <input name="address" className="form-input"
                                    placeholder="e.g. 12 Shanti Nagar, Opp. Central Mall"
                                    value={form.address} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">State</label>
                                <select name="state" className="form-select"
                                    value={form.state} onChange={handleChange}>
                                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">City</label>
                                <select name="city" className="form-select"
                                    value={form.city} onChange={handleChange}
                                    disabled={!form.state}>
                                    <option value="">Select city</option>
                                    {(CITIES_BY_STATE[form.state] || []).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Personal Trainer Assignment</h3>
                        <div className="form-group">
                            <label className="form-label">Assigned Trainer</label>
                            <select
                                name="assignedTrainer"
                                className="form-select"
                                value={form.assignedTrainer}
                                onChange={handleChange}
                            >
                                <option value="">— No trainer assigned —</option>
                                {trainers.map(t => (
                                    <option key={t._id} value={t._id}>
                                        {t.name}{t.isPersonalTrainer ? ' (Personal Trainer available)' : ''}
                                    </option>
                                ))}
                            </select>
                            {trainers.length === 0 && (
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                                    No trainers available. Add trainers in the Staff module first.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Emergency Contact</h3>
                        <div className="add-customer-grid">
                            <div className="form-group">
                                <label className="form-label">Contact Name</label>
                                <input name="emergencyContactName" className="form-input" placeholder="Emergency contact name"
                                    value={form.emergencyContactName} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Contact Phone</label>
                                <input name="emergencyContactPhone" className="form-input" placeholder="Emergency contact phone"
                                    value={form.emergencyContactPhone} onChange={handleChange} />
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Health Notes</h3>
                        <div className="form-group">
                            <label className="form-label">Medical / Health Information</label>
                            <textarea name="healthNotes" className="form-textarea" rows={3}
                                placeholder="Any medical conditions or special requirements..."
                                value={form.healthNotes} onChange={handleChange} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary"
                            onClick={() => navigate('/admin/customers')}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving && <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />}
                            {isEditMode ? 'Update Customer' : 'Save Customer'}
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    )
}

export default AddCustomer