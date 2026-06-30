import { useState, useEffect } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import Modal from '../../../components/shared/Modal'
import { membershipService } from '../../../services/membershipService'
import { formatCurrency } from '../../../utils/helpers'
import './memberships.css'

const emptyForm = { name: '', duration: '', price: '', description: '', features: '' }

function Memberships() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, editing: null })
  const [deleteModal, setDeleteModal] = useState({ open: false, plan: null })
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const colorMap = ['#111111', '#1a1a1a', '#2b2b2b', '#3d3d3d', '#111111', '#222222']

  const fetchPlans = async () => {
    setLoading(true)
    try {
      const res = await membershipService.getAll()
      setPlans(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPlans() }, [])

  const openAdd = () => {
    setForm(emptyForm)
    setModal({ open: true, editing: null })
  }

  const openEdit = (plan) => {
    setForm({
      name: plan.name,
      duration: plan.duration,
      price: plan.price,
      description: plan.description || '',
      features: plan.features.join('\n'),
    })
    setModal({ open: true, editing: plan })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const features = form.features
        .split('\n')
        .map(f => f.trim())
        .filter(Boolean)

      const data = {
        name: form.name,
        duration: form.duration,
        price: Number(form.price),
        description: form.description,
        features,
        color: colorMap[plans.length % colorMap.length],
      }

      if (modal.editing) {
        await membershipService.update(modal.editing._id, data)
      } else {
        await membershipService.create(data)
      }
      setModal({ open: false, editing: null })
      fetchPlans()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await membershipService.delete(deleteModal.plan._id)
      setDeleteModal({ open: false, plan: null })
      fetchPlans()
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AdminLayout>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Memberships</h1>
            <p className="page-subtitle">{plans.length} plans available</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Plan
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
          </div>
        ) : plans.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
              <h3>No membership plans yet</h3>
              <p>Add your first membership plan to get started</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openAdd}>
                Add First Plan
              </button>
            </div>
          </div>
        ) : (
          <div className="plans-grid">
            {plans.map((plan) => (
              <div key={plan._id} className="plan-card">
                <div className="plan-card-header" style={{ background: plan.color || '#111111' }}>
                  <div>
                    <h3 className="plan-name">{plan.name}</h3>
                    <p className="plan-duration">{plan.duration}</p>
                  </div>
                  <div className="plan-price-box">
                    <p className="plan-price">{formatCurrency(plan.price)}</p>
                    <p className="plan-price-sub">/ plan</p>
                  </div>
                </div>
                <div className="plan-card-body">
                  <p className="plan-desc">{plan.description}</p>
                  <ul className="plan-features">
                    {plan.features.map((f, i) => (
                      <li key={i} className="plan-feature-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                          width="14" height="14" style={{ color: plan.color || '#111111', flexShrink: 0 }}>
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="plan-card-footer">
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}
                    onClick={() => openEdit(plan)}>Edit</button>
                  <button className="btn btn-sm" style={{ flex: 1, background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}
                    onClick={() => setDeleteModal({ open: true, plan })}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        <Modal
          isOpen={modal.open}
          onClose={() => setModal({ open: false, editing: null })}
          title={modal.editing ? 'Edit Plan' : 'Add New Plan'}
          footer={
            <>
              <button className="btn btn-secondary"
                onClick={() => setModal({ open: false, editing: null })}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving
                  ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  : 'Save Plan'
                }
              </button>
            </>
          }
        >
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Plan Name *</label>
              <input className="form-input" placeholder="e.g. Premium"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Duration *</label>
              <select className="form-select" value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}>
                <option value="">Select duration</option>
                <option value="1 Month">1 Month</option>
                <option value="3 Months">3 Months</option>
                <option value="6 Months">6 Months</option>
                <option value="1 Year">1 Year</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Price (₹) *</label>
              <input type="number" className="form-input" placeholder="e.g. 1999"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="Short description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Features (one per line)</label>
            <textarea className="form-textarea" rows={5}
              placeholder={'Access to gym floor\nLocker room\nGroup classes'}
              value={form.features}
              onChange={(e) => setForm({ ...form, features: e.target.value })} />
          </div>
        </Modal>

        {/* Delete Modal */}
        <Modal
          isOpen={deleteModal.open}
          onClose={() => setDeleteModal({ open: false, plan: null })}
          title="Delete Plan"
          footer={
            <>
              <button className="btn btn-secondary"
                onClick={() => setDeleteModal({ open: false, plan: null })}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting
                  ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  : 'Delete'
                }
              </button>
            </>
          }
        >
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p>Delete the <strong>{deleteModal.plan?.name}</strong> plan?</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
              Members on this plan will need to be reassigned.
            </p>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  )
}

export default Memberships