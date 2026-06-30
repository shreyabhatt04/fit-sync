import { useState, useEffect } from 'react'
import api from '../../services/api'
import SuperadminLayout from './SuperadminLayout'
import './superadmin.css'

export default function SuperadminPricing() {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // module id being edited
  const [form,    setForm]    = useState({})
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    api.get('/superadmin/module-prices')
      .then(res => setModules(res.data.data))
      .finally(() => setLoading(false))
  }, [])

  const startEdit = (m) => {
    setEditing(m._id)
    setForm({
      monthly:   m.pricing.monthly,
      quarterly: m.pricing.quarterly,
      yearly:    m.pricing.yearly,
    })
  }

  const handleSave = async (id) => {
    setSaving(true)
    try {
      const { data } = await api.put(`/superadmin/module-prices/${id}`, { pricing: form })
      setModules(prev => prev.map(m => m._id === id ? data.data : m))
      setEditing(null)
    } catch {
      alert('Failed to save pricing')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SuperadminLayout title="Module Pricing">
      <div className="sa-page">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Module Prices (₹ per billing cycle)</h3>
          </div>

          {loading ? (
            <div className="sa-loading"><div className="spinner" /></div>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>MODULE</th>
                    <th>MONTHLY (₹)</th>
                    <th>QUARTERLY (₹)</th>
                    <th>YEARLY (₹)</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map(m => (
                    <tr key={m._id}>
                      <td>
                        <p style={{ fontWeight: 600, fontSize: 14 }}>{m.label}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.module}</p>
                      </td>

                      {editing === m._id ? (
                        <>
                          {['monthly','quarterly','yearly'].map(cycle => (
                            <td key={cycle}>
                              <input
                                type="number"
                                className="form-input"
                                style={{ width: 90 }}
                                value={form[cycle]}
                                onChange={e => setForm(p => ({ ...p, [cycle]: Number(e.target.value) }))}
                                min={0}
                              />
                            </td>
                          ))}
                          <td>
                            <div className="sa-actions">
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleSave(m._id)}
                                disabled={saving}
                              >
                                {saving ? '...' : 'Save'}
                              </button>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => setEditing(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>₹{m.pricing.monthly}</td>
                          <td>₹{m.pricing.quarterly}</td>
                          <td>₹{m.pricing.yearly}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => startEdit(m)}
                            >
                              Edit
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </SuperadminLayout>
  )
}
