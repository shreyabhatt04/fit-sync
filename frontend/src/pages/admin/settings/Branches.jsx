import { useState, useEffect } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import Modal from '../../../components/shared/Modal'
import { branchService } from '../../../services/branchService'

const emptyForm = { name: '', address: '', phone: '', manager: '' }
const branchIcons = ['🏢', '🏋️', '💪', '⭐', '🌟']

function Branches() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, editing: null })
  const [deleteModal, setDeleteModal] = useState({ open: false, branch: null })
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formError, setFormError] = useState('')
  const [apiError, setApiError] = useState('')

  const fetchBranches = async () => {
    setLoading(true)
    try {
      const res = await branchService.getAll()
      setBranches(res.data)
    } catch (err) {
      setApiError('Failed to load branches')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBranches() }, [])

  const openAdd = () => {
    setForm(emptyForm)
    setFormError('')
    setModal({ open: true, editing: null })
  }

  const openEdit = (b) => {
    setForm({ name: b.name, address: b.address, phone: b.phone, manager: b.manager })
    setFormError('')
    setModal({ open: true, editing: b })
  }

  const closeModal = () => {
    setModal({ open: false, editing: null })
    setForm(emptyForm)
    setFormError('')
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Branch name is required'); return }
    setSaving(true)
    setFormError('')
    try {
      if (modal.editing) {
        await branchService.update(modal.editing._id, form)
      } else {
        await branchService.create(form)
      }
      closeModal()
      fetchBranches()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save branch')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await branchService.delete(deleteModal.branch._id)
      setDeleteModal({ open: false, branch: null })
      fetchBranches()
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to delete branch')
      setDeleteModal({ open: false, branch: null })
    } finally {
      setDeleting(false)
    }
  }

  const handleSetMain = async (branch) => {
    try {
      await branchService.setMain(branch._id)
      fetchBranches()
    } catch (err) {
      setApiError('Failed to update main branch')
    }
  }

  return (
    <AdminLayout>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Branches</h1>
            <p className="page-subtitle">
              {branches.length} gym location{branches.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Branch
          </button>
        </div>

        {apiError && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            {apiError}
            <button
              style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => setApiError('')}
            >✕</button>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
          </div>
        ) : branches.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <h3>No branches yet</h3>
              <p>Add your first gym location to get started</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openAdd}>
                Add First Branch
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {branches.map((b, i) => (
              <div key={b._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 'var(--radius-md)',
                    background: 'var(--primary-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                  }}>
                    {branchIcons[i % branchIcons.length]}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-icon" onClick={() => openEdit(b)} title="Edit">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    {!b.isMain && (
                      <button
                        className="btn-icon"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => setDeleteModal({ open: true, branch: b })}
                        title="Delete"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" /><path d="M14 11v6" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
                  {b.name}
                </h3>

                {[
                  { icon: '📍', text: b.address || '—' },
                  { icon: '📞', text: b.phone || '—' },
                  { icon: '👤', text: b.manager ? `Manager: ${b.manager}` : 'No manager set' },
                  { icon: '👥', text: `${b.memberCount ?? 0} members` },
                ].map((item, idx) => (
                  <p key={idx} style={{
                    fontSize: 13, color: 'var(--text-secondary)',
                    marginBottom: 6, display: 'flex', gap: 6, alignItems: 'flex-start',
                  }}>
                    <span>{item.icon}</span>
                    <span>{item.text}</span>
                  </p>
                ))}

                <div style={{
                  marginTop: 14, paddingTop: 14,
                  borderTop: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span className={`badge ${b.isMain ? 'badge-success' : 'badge-info'}`}>
                    {b.isMain ? 'Main Branch' : 'Branch'}
                  </span>
                  {!b.isMain && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleSetMain(b)}
                    >
                      Set as Main
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add / Edit Modal */}
        <Modal
          isOpen={modal.open}
          onClose={closeModal}
          title={modal.editing ? 'Edit Branch' : 'Add New Branch'}
          footer={
            <>
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving
                  ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  : modal.editing ? 'Update Branch' : 'Save Branch'
                }
              </button>
            </>
          }
        >
          {formError && (
            <div className="alert alert-danger" style={{ marginBottom: 12 }}>{formError}</div>
          )}
          <div className="form-group">
            <label className="form-label">Branch Name *</label>
            <input
              className="form-input"
              placeholder="e.g. FitSync — Satellite"
              value={form.name}
              onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormError('') }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <input
              className="form-input"
              placeholder="Full address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                className="form-input"
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Manager Name</label>
              <input
                className="form-input"
                placeholder="Manager name"
                value={form.manager}
                onChange={(e) => setForm({ ...form, manager: e.target.value })}
              />
            </div>
          </div>
        </Modal>

        {/* Delete Modal */}
        <Modal
          isOpen={deleteModal.open}
          onClose={() => setDeleteModal({ open: false, branch: null })}
          title="Delete Branch"
          footer={
            <>
              <button className="btn btn-secondary"
                onClick={() => setDeleteModal({ open: false, branch: null })}>
                Cancel
              </button>
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
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <p>Delete <strong>{deleteModal.branch?.name}</strong>?</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
              This action cannot be undone.
            </p>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  )
}

export default Branches