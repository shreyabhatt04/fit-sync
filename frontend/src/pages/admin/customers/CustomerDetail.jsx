import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AdminLayout from '../../../components/admin/AdminLayout'
import { customerService } from '../../../services/customerService'
import { subscriptionService } from '../../../services/subscriptionService'
import { attendanceService } from '../../../services/attendanceService'
import { paymentService } from '../../../services/paymentService'
import { formatDate, formatCurrency, getInitials, getStatusClass } from '../../../utils/helpers'
import './customers.css'

function CustomerDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [customer, setCustomer] = useState(null)
    const [subscriptions, setSubscriptions] = useState([])
    const [attendance, setAttendance] = useState([])
    const [payments, setPayments] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('overview')
    const [tabLoading, setTabLoading] = useState(false)

    useEffect(() => {
        const fetchCustomer = async () => {
            try {
                const res = await customerService.getById(id)
                setCustomer(res.data)
            } catch (err) {
                console.error(err)
                navigate('/admin/customers')
            } finally {
                setLoading(false)
            }
        }
        fetchCustomer()
    }, [id])

    useEffect(() => {
        const fetchTabData = async () => {
            setTabLoading(true)
            try {
                if (activeTab === 'subscriptions') {
                    const res = await subscriptionService.getAll({ customer: id, limit: 20 })
                    setSubscriptions(res.data)
                }
                if (activeTab === 'attendance') {
                    const res = await attendanceService.getAll({ customerId: id })
                    setAttendance(res.data)
                }
                if (activeTab === 'payments') {
                    const res = await paymentService.getAll({ customer: id, limit: 20 })
                    setPayments(res.data)
                }
            } catch (err) {
                console.error(err)
            } finally {
                setTabLoading(false)
            }
        }
        if (activeTab !== 'overview') fetchTabData()
    }, [activeTab, id])

    const tabs = [
        { key: 'overview', label: 'Overview' },
        { key: 'subscriptions', label: 'Subscriptions' },
        { key: 'attendance', label: 'Attendance' },
        { key: 'payments', label: 'Payments' },
    ]

    if (loading) {
        return (
            <AdminLayout>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                    <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
                </div>
            </AdminLayout>
        )
    }

    if (!customer) return null

    return (
        <AdminLayout>
            <div className="page-content">
                <button className="btn btn-secondary btn-sm"
                    style={{ marginBottom: 16 }}
                    onClick={() => navigate('/admin/customers')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Back to Customers
                </button>

                {/* Profile Header */}
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="customer-detail-header">
                        <div className="customer-profile-card">
                            <div className="customer-avatar-lg">
                                {getInitials(`${customer.firstName} ${customer.lastName}`)}
                            </div>
                            <div>
                                <h2 className="customer-detail-name">
                                    {customer.firstName} {customer.lastName}
                                </h2>
                                <div className="customer-detail-meta">
                                    <span>{customer.email}</span>
                                    <span>·</span>
                                    <span>{customer.phone}</span>
                                    <span>·</span>
                                    <span className={`badge ${getStatusClass(customer.status)}`}>
                                        {customer.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                            <button className="btn btn-secondary btn-sm"
                                onClick={() => navigate(`/admin/customers/add?edit=${customer._id}`)}>
                                Edit Profile
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="tabs">
                    {tabs.map((t) => (
                        <button key={t.key}
                            className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(t.key)}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="card">
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>
                            Personal Details
                        </h3>
                        <div className="detail-grid">
                            {[
                                { label: 'Full Name', value: `${customer.firstName} ${customer.lastName}` },
                                { label: 'Gender', value: customer.gender },
                                { label: 'Date of Birth', value: formatDate(customer.dateOfBirth) },
                                { label: 'Blood Group', value: customer.bloodGroup || '—' },
                                { label: 'Marital Status', value: customer.maritalStatus || '—' },
                                { label: 'Anniversary', value: customer.anniversary ? formatDate(customer.anniversary) : '—' },
                                { label: 'Phone', value: customer.phone },
                                { label: 'Email', value: customer.email },
                                { label: 'Join Date', value: formatDate(customer.joinDate) },
                                { label: 'Address', value: customer.address },
                                { label: 'City', value: customer.city || '—' },
                                { label: 'State', value: customer.state || '—' },
                                { label: 'Status', value: customer.status },
                                {
                                    label: 'Emergency Contact', value: customer.emergencyContact?.name
                                        ? `${customer.emergencyContact.name} (${customer.emergencyContact.phone})`
                                        : '—'
                                },
                                { label: 'Health Notes', value: customer.healthNotes || '—' },
                                { label: 'Assigned Trainer',
                                  value: customer.assignedTrainer?.name || '—' },
                            ].map((item) => (
                                <div key={item.label} className="detail-item">
                                    <label>{item.label}</label>
                                    <p>{item.value || '—'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Subscriptions Tab */}
                {activeTab === 'subscriptions' && (
                    <div className="card" style={{ padding: 0 }}>
                        {tabLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                                <div className="spinner" />
                            </div>
                        ) : (
                            <div className="table-container" style={{ border: 'none' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Plan</th><th>Start Date</th>
                                            <th>End Date</th><th>Amount</th><th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subscriptions.length === 0 ? (
                                            <tr><td colSpan="5">
                                                <div className="empty-state"><p>No subscriptions found</p></div>
                                            </td></tr>
                                        ) : subscriptions.map((s) => (
                                            <tr key={s._id}>
                                                <td style={{ fontWeight: 500 }}>{s.membership?.name}</td>
                                                <td style={{ fontSize: 13 }}>{formatDate(s.startDate)}</td>
                                                <td style={{ fontSize: 13 }}>{formatDate(s.endDate)}</td>
                                                <td style={{ fontWeight: 600 }}>{formatCurrency(s.amount)}</td>
                                                <td>
                                                    <span className={`badge ${getStatusClass(s.status)}`}>
                                                        {s.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Attendance Tab */}
                {activeTab === 'attendance' && (
                    <div className="card" style={{ padding: 0 }}>
                        {tabLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                                <div className="spinner" />
                            </div>
                        ) : (
                            <div className="table-container" style={{ border: 'none' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Date</th><th>Check In</th>
                                            <th>Check Out</th><th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendance.length === 0 ? (
                                            <tr><td colSpan="4">
                                                <div className="empty-state"><p>No attendance records found</p></div>
                                            </td></tr>
                                        ) : attendance.slice(0, 30).map((a) => (
                                            <tr key={a._id}>
                                                <td style={{ fontWeight: 500 }}>{formatDate(a.date)}</td>
                                                <td style={{ fontSize: 13 }}>{a.checkIn || '—'}</td>
                                                <td style={{ fontSize: 13 }}>{a.checkOut || '—'}</td>
                                                <td>
                                                    <span className={`badge ${a.status === 'present' ? 'badge-success' : 'badge-danger'}`}>
                                                        {a.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Payments Tab */}
                {activeTab === 'payments' && (
                    <div className="card" style={{ padding: 0 }}>
                        {tabLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                                <div className="spinner" />
                            </div>
                        ) : (
                            <div className="table-container" style={{ border: 'none' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Invoice</th><th>Amount</th>
                                            <th>Date</th><th>Mode</th><th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.length === 0 ? (
                                            <tr><td colSpan="5">
                                                <div className="empty-state"><p>No payments found</p></div>
                                            </td></tr>
                                        ) : payments.map((p) => (
                                            <tr key={p._id}>
                                                <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 13 }}>
                                                    {p.invoiceNumber}
                                                </td>
                                                <td style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                                                <td style={{ fontSize: 13 }}>{formatDate(p.paymentDate)}</td>
                                                <td>{p.mode}</td>
                                                <td>
                                                    <span className={`badge ${getStatusClass(p.status)}`}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}

export default CustomerDetail