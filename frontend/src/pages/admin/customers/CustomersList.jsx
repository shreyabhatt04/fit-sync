import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AdminLayout from '../../../components/admin/AdminLayout'
import Modal from '../../../components/shared/Modal'
import Pagination from '../../../components/shared/Pagination'
import { customerService } from '../../../services/customerService'
import { formatDate, getInitials, getStatusClass } from '../../../utils/helpers'
import './customers.css'

const ITEMS_PER_PAGE = 8

function CustomersList() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [deleteModal, setDeleteModal] = useState({ open: false, customer: null })
  const [deleting, setDeleting] = useState(false)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: ITEMS_PER_PAGE }
      if (search) params.search = search
      if (filterStatus !== 'all') params.status = filterStatus
      const res = await customerService.getAll(params)
      setCustomers(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      console.error('Error fetching customers:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, filterStatus])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1) }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await customerService.delete(deleteModal.customer._id)
      setDeleteModal({ open: false, customer: null })
      fetchCustomers()
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setDeleting(false)
    }
  }

  const planColors = {
    Basic: 'badge-gray', Standard: 'badge-info',
    Premium: 'badge-purple', Elite: 'badge-orange',
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  return (
    <AdminLayout>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Customers</h1>
            <p className="page-subtitle">{total} total members</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import
            </button>
            <Link to="/admin/customers/add" className="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Customer
            </Link>
          </div>
        </div>

        <div className="filter-bar">
          <div className="search-input-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" className="search-input"
              placeholder="Search by name, email or phone..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 150 }} value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Member</th><th>Contact</th><th>Join Date</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5">
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                      <div className="spinner" />
                    </div>
                  </td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan="5">
                    <div className="empty-state">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                      </svg>
                      <h3>No customers found</h3>
                      <p>Try adjusting your search or filters</p>
                    </div>
                  </td></tr>
                ) : customers.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <div className="member-cell">
                        <div className="avatar" style={{ background: '#f2f2f2', color: '#2b2b2b' }}>
                          {getInitials(`${c.firstName} ${c.lastName}`)}
                        </div>
                        <div>
                          <p className="member-cell-name">{c.firstName} {c.lastName}</p>
                          <p className="member-cell-sub">{c.gender || 'Member'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p style={{ fontSize: 13 }}>{c.email}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.phone}</p>
                    </td>
                    <td style={{ fontSize: 13 }}>{formatDate(c.joinDate)}</td>
                    <td>
                      <span className={`badge ${getStatusClass(c.status)}`}>{c.status}</span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-icon" title="View"
                          onClick={() => navigate(`/admin/customers/${c._id}`)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                        <button className="btn-icon" title="Edit"
                          onClick={() => navigate(`/admin/customers/add?edit=${c._id}`)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button className="btn-icon" title="Delete"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => setDeleteModal({ open: true, customer: c })}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} totalItems={total} onPageChange={setPage} />
        </div>

        <Modal
          isOpen={deleteModal.open}
          onClose={() => setDeleteModal({ open: false, customer: null })}
          title="Delete Customer"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setDeleteModal({ open: false, customer: null })}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Delete'}
              </button>
            </>
          }
        >
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <p>Delete <strong>{deleteModal.customer?.firstName} {deleteModal.customer?.lastName}</strong>?</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>This cannot be undone.</p>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  )
}

export default CustomersList