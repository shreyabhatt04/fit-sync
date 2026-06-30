import { useState, useEffect } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import Modal from '../../../components/shared/Modal'
import Pagination from '../../../components/shared/Pagination'
import { expenseService } from '../../../services/expenseService'
import { formatDate, formatCurrency } from '../../../utils/helpers'
import '../payments/payments.css'

const emptyForm = { category: '', description: '', amount: '', date: '' }

// ─── Expense categories (Batch 9b — guide feedback #7) ─────────────
// Must match the enum in backend/models/Expense.js exactly.
const CATEGORIES = [
    'Equipment', 'Rent', 'Utilities', 'Electricity', 'Telephone',
    'Internet', 'Staff Salary', 'Trainer Salary', 'Cleaning',
    'Maintenance', 'Marketing', 'Fuel', 'Travel', 'Transport',
    'Meals', 'Taxes', 'Insurance', 'Supplies', 'Other',
]
const ITEMS_PER_PAGE = 8

function Expenses() {
    const [expenses, setExpenses] = useState([])
    const [stats, setStats] = useState({ total: 0, thisMonth: 0 })
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [filterCat, setFilterCat] = useState('all')
    const [page, setPage] = useState(1)
    const [modal, setModal] = useState(false)
    const [deleteModal, setDeleteModal] = useState({ open: false, expense: null })
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const fetchAll = async () => {
        setLoading(true)
        try {
            const params = { page, limit: ITEMS_PER_PAGE }
            if (filterCat !== 'all') params.category = filterCat

            const [expensesRes, statsRes] = await Promise.all([
                expenseService.getAll(params),
                expenseService.getStats(),
            ])
            setExpenses(expensesRes.data)
            setTotal(expensesRes.pagination.total)
            setStats(statsRes.data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchAll() }, [page, filterCat])

    const handleSave = async () => {
        setSaving(true)
        try {
            await expenseService.create({
                ...form,
                amount: Number(form.amount),
            })
            setModal(false)
            setForm(emptyForm)
            fetchAll()
        } catch (err) {
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await expenseService.delete(deleteModal.expense._id)
            setDeleteModal({ open: false, expense: null })
            fetchAll()
        } catch (err) {
            console.error(err)
        } finally {
            setDeleting(false)
        }
    }

    const getCatClass = (cat) => {
        const map = {
            Equipment: 'cat-equipment', Rent: 'cat-rent',
            Utilities: 'cat-utilities', Staff: 'cat-staff',
            Marketing: 'cat-marketing', Other: 'cat-other',
        }
        return map[cat] || 'cat-other'
    }

    const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

    return (
        <AdminLayout>
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Expenses</h1>
                        <p className="page-subtitle">Track all business expenses</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setModal(true)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Expense
                    </button>
                </div>

                {/* Summary */}
                <div className="expenses-summary">
                    <div className="expense-summary-card">
                        <p className="expense-summary-label">Total Expenses</p>
                        <p className="expense-summary-value">{formatCurrency(stats.total)}</p>
                    </div>
                    <div className="expense-summary-card">
                        <p className="expense-summary-label">This Month</p>
                        <p className="expense-summary-value">{formatCurrency(stats.thisMonth)}</p>
                    </div>
                </div>

                {/* Filter */}
                <div className="filter-bar">
                    <select className="form-select" style={{ width: 200 }} value={filterCat}
                        onChange={(e) => { setFilterCat(e.target.value); setPage(1) }}>
                        <option value="all">All Categories</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {/* Table */}
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-container" style={{ border: 'none' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Category</th><th>Description</th><th>Amount</th>
                                    <th>Date</th><th>Added By</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="6">
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                                            <div className="spinner" />
                                        </div>
                                    </td></tr>
                                ) : expenses.length === 0 ? (
                                    <tr><td colSpan="6">
                                        <div className="empty-state">
                                            <h3>No expenses found</h3>
                                        </div>
                                    </td></tr>
                                ) : expenses.map((e) => (
                                    <tr key={e._id}>
                                        <td>
                                            <span className={`category-badge ${getCatClass(e.category)}`}>
                                                {e.category}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 13 }}>{e.description}</td>
                                        <td style={{ fontWeight: 600 }}>{formatCurrency(e.amount)}</td>
                                        <td style={{ fontSize: 13 }}>{formatDate(e.date)}</td>
                                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                            {e.addedBy?.name || 'Admin'}
                                        </td>
                                        <td>
                                            <button className="btn-icon" style={{ color: 'var(--danger)' }}
                                                onClick={() => setDeleteModal({ open: true, expense: e })}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                                    <path d="M10 11v6" /><path d="M14 11v6" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination page={page} totalPages={totalPages}
                        totalItems={total} onPageChange={setPage} />
                </div>

                {/* Add Modal */}
                <Modal isOpen={modal} onClose={() => setModal(false)} title="Add Expense"
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving
                                    ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                    : 'Save'
                                }
                            </button>
                        </>
                    }
                >
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Category *</label>
                            <select className="form-select" value={form.category}
                                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                <option value="">Select category</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Amount (₹) *</label>
                            <input type="number" className="form-input" placeholder="Amount"
                                value={form.amount}
                                onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description *</label>
                        <input className="form-input" placeholder="Describe the expense"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Date *</label>
                        <input type="date" className="form-input"
                            value={form.date}
                            onChange={(e) => setForm({ ...form, date: e.target.value })} />
                    </div>
                </Modal>

                {/* Delete Modal */}
                <Modal isOpen={deleteModal.open}
                    onClose={() => setDeleteModal({ open: false, expense: null })}
                    title="Delete Expense"
                    footer={
                        <>
                            <button className="btn btn-secondary"
                                onClick={() => setDeleteModal({ open: false, expense: null })}>Cancel</button>
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
                        <p>Delete <strong>{deleteModal.expense?.description}</strong>?</p>
                    </div>
                </Modal>
            </div>
        </AdminLayout>
    )
}

export default Expenses