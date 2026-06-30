import { useState, useEffect } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import Modal from '../../../components/shared/Modal'
import { taskService } from '../../../services/taskService'
import { formatDate } from '../../../utils/helpers'
import './tasks.css'

const columns = [
    { key: 'todo', label: 'To Do', color: '#808080' },
    { key: 'inprogress', label: 'In Progress', color: '#2b2b2b' },
    { key: 'done', label: 'Done', color: '#16a34a' },
]

const emptyForm = {
    title: '', desc: '', priority: 'medium',
    due: '', assignee: 'Admin', column: 'todo',
}

const priorityClass = { high: 'priority-high', medium: 'priority-medium', low: 'priority-low' }

function Tasks() {
    const [tasks, setTasks] = useState({ todo: [], inprogress: [], done: [] })
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState({ open: false, editing: null })
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [deleteModal, setDeleteModal] = useState({ open: false, task: null })
    const [deleting, setDeleting] = useState(false)

    const fetchTasks = async () => {
        setLoading(true)
        try {
            const res = await taskService.getAll()
            setTasks(res.data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchTasks() }, [])

    const openAdd = (col = 'todo') => {
        setForm({ ...emptyForm, column: col })
        setModal({ open: true, editing: null })
    }

    const openEdit = (task) => {
        setForm({
            title: task.title, desc: task.description || '',
            priority: task.priority, due: task.dueDate?.split('T')[0] || '',
            assignee: task.assignedTo || 'Admin', column: task.status,
        })
        setModal({ open: true, editing: task })
    }

    const handleSave = async () => {
        if (!form.title.trim()) return
        setSaving(true)
        try {
            const data = {
                title: form.title,
                description: form.desc,
                priority: form.priority,
                dueDate: form.due || undefined,
                assignedTo: form.assignee,
                status: form.column,
            }
            if (modal.editing) {
                await taskService.update(modal.editing._id, data)
            } else {
                await taskService.create(data)
            }
            setModal({ open: false, editing: null })
            fetchTasks()
        } catch (err) {
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await taskService.delete(deleteModal.task._id)
            setDeleteModal({ open: false, task: null })
            fetchTasks()
        } catch (err) {
            console.error(err)
        } finally {
            setDeleting(false)
        }
    }

    const handleMove = async (task, toCol) => {
        try {
            await taskService.move(task._id, toCol)
            fetchTasks()
        } catch (err) {
            console.error(err)
        }
    }

    const totalCount = Object.values(tasks).flat().length

    return (
        <AdminLayout>
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Tasks</h1>
                        <p className="page-subtitle">{totalCount} total tasks</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => openAdd()}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Task
                    </button>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
                        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
                    </div>
                ) : (
                    <div className="kanban-board">
                        {columns.map((col) => (
                            <div key={col.key} className="kanban-col">
                                <div className="kanban-col-header">
                                    <div className="kanban-col-title-row">
                                        <div className="kanban-col-dot" style={{ background: col.color }} />
                                        <h3 className="kanban-col-title">{col.label}</h3>
                                        <span className="kanban-col-count">{tasks[col.key]?.length || 0}</span>
                                    </div>
                                    <button className="btn-icon" onClick={() => openAdd(col.key)} title="Add task">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="kanban-tasks">
                                    {!tasks[col.key]?.length && (
                                        <div className="kanban-empty">
                                            <p>No tasks here</p>
                                        </div>
                                    )}
                                    {tasks[col.key]?.map((task) => (
                                        <div key={task._id} className="task-card">
                                            <div className="task-card-top">
                                                <span className={`priority-badge ${priorityClass[task.priority]}`}>
                                                    {task.priority}
                                                </span>
                                                <div style={{ display: 'flex', gap: 2, marginLeft: 'auto' }}>
                                                    <button className="btn-icon" onClick={() => openEdit(task)}>
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                        </svg>
                                                    </button>
                                                    <button className="btn-icon" style={{ color: 'var(--danger)' }}
                                                        onClick={() => setDeleteModal({ open: true, task })}>
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <polyline points="3 6 5 6 21 6" />
                                                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            <h4 className="task-title">{task.title}</h4>
                                            {task.description && (
                                                <p className="task-desc">{task.description}</p>
                                            )}

                                            <div className="task-meta">
                                                {task.dueDate && (
                                                    <span className="task-due">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                            strokeWidth="2" width="12" height="12">
                                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                            <line x1="16" y1="2" x2="16" y2="6" />
                                                            <line x1="8" y1="2" x2="8" y2="6" />
                                                            <line x1="3" y1="10" x2="21" y2="10" />
                                                        </svg>
                                                        {formatDate(task.dueDate)}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="task-move-btns">
                                                {col.key !== 'todo' && (
                                                    <button className="task-move-btn"
                                                        onClick={() => handleMove(task, columns[columns.findIndex(c => c.key === col.key) - 1].key)}>
                                                        ← Move Back
                                                    </button>
                                                )}
                                                {col.key !== 'done' && (
                                                    <button className="task-move-btn task-move-forward"
                                                        onClick={() => handleMove(task, columns[columns.findIndex(c => c.key === col.key) + 1].key)}>
                                                        Move Forward →
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add/Edit Modal */}
                <Modal
                    isOpen={modal.open}
                    onClose={() => setModal({ open: false, editing: null })}
                    title={modal.editing ? 'Edit Task' : 'Add Task'}
                    footer={
                        <>
                            <button className="btn btn-secondary"
                                onClick={() => setModal({ open: false, editing: null })}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving
                                    ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                    : 'Save'
                                }
                            </button>
                        </>
                    }
                >
                    <div className="form-group">
                        <label className="form-label">Title *</label>
                        <input className="form-input" placeholder="Task title"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea className="form-textarea" rows={2} placeholder="Task description"
                            value={form.desc}
                            onChange={(e) => setForm({ ...form, desc: e.target.value })} />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Priority</label>
                            <select className="form-select" value={form.priority}
                                onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Due Date</label>
                            <input type="date" className="form-input"
                                value={form.due}
                                onChange={(e) => setForm({ ...form, due: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Column</label>
                            <select className="form-select" value={form.column}
                                onChange={(e) => setForm({ ...form, column: e.target.value })}>
                                <option value="todo">To Do</option>
                                <option value="inprogress">In Progress</option>
                                <option value="done">Done</option>
                            </select>
                        </div>
                    </div>
                </Modal>

                {/* Delete Modal */}
                <Modal
                    isOpen={deleteModal.open}
                    onClose={() => setDeleteModal({ open: false, task: null })}
                    title="Delete Task"
                    footer={
                        <>
                            <button className="btn btn-secondary"
                                onClick={() => setDeleteModal({ open: false, task: null })}>Cancel</button>
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
                        <p>Delete task <strong>{deleteModal.task?.title}</strong>?</p>
                    </div>
                </Modal>
            </div>
        </AdminLayout>
    )
}

export default Tasks