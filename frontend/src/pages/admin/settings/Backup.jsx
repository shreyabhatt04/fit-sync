import { useState, useEffect } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import { formatDate } from '../../../utils/helpers'

// Format bytes into KB / MB
const formatSize = (bytes) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function Backup() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [history, setHistory] = useState([])
    const [historyLoading, setHistoryLoading] = useState(true)

    const fetchHistory = async () => {
        setHistoryLoading(true)
        try {
            const token = localStorage.getItem('fitsync_token')
            const res = await fetch('http://localhost:5000/api/backup/history', {
                headers: { Authorization: `Bearer ${token}` },
            })
            const data = await res.json()
            if (data.success) setHistory(data.data)
        } catch (err) {
            console.error('Failed to load backup history', err)
        } finally {
            setHistoryLoading(false)
        }
    }

    useEffect(() => { fetchHistory() }, [])

    const handleDownload = async () => {
        setLoading(true)
        setError('')
        setSuccess('')
        try {
            const token = localStorage.getItem('fitsync_token')

            // Use fetch directly — axios can't trigger a file download
            const res = await fetch('http://localhost:5000/api/backup/download', {
                headers: { Authorization: `Bearer ${token}` },
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.message || 'Backup failed')
            }

            // Get filename from Content-Disposition header
            const disposition = res.headers.get('Content-Disposition') || ''
            const match = disposition.match(/filename="(.+)"/)
            const filename = match ? match[1] : 'fitsync-backup.json'

            // Convert response to blob and trigger browser download
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            setSuccess(`Backup downloaded: ${filename}`)
            setTimeout(() => setSuccess(''), 5000)

            // Refresh history to show the new entry
            fetchHistory()
        } catch (err) {
            setError(err.message || 'Backup failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const latestBackup = history[0]

    return (
        <AdminLayout>
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Backup</h1>
                        <p className="page-subtitle">Download a complete export of your gym data</p>
                    </div>
                </div>

                {success && (
                    <div className="alert alert-success" style={{ marginBottom: 20 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {success}
                    </div>
                )}

                {error && (
                    <div className="alert alert-danger" style={{ marginBottom: 20 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {error}
                    </div>
                )}

                {/* Download card */}
                <div className="card" style={{ maxWidth: 500, marginBottom: 24, textAlign: 'center', padding: 40 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>💾</div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Create New Backup</h3>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
                        Downloads a <strong>.json</strong> file containing all your gym data —
                        members, payments, subscriptions, attendance, expenses, and more.
                    </p>

                    <button className="btn btn-primary btn-lg" onClick={handleDownload} disabled={loading}>
                        {loading ? (
                            <>
                                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                Preparing backup…
                            </>
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Download Backup
                            </>
                        )}
                    </button>

                    {latestBackup && (
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
                            Last backup: {formatDate(latestBackup.createdAt)} · {formatSize(latestBackup.sizeBytes)}
                        </p>
                    )}
                </div>

                {/* What's included info */}
                <div className="card" style={{ maxWidth: 500, marginBottom: 24, padding: '20px 24px' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>What's included in the backup</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
                        {[
                            'Customers', 'Memberships', 'Subscriptions',
                            'Payments', 'Attendance records', 'Expenses',
                            'Enquiries', 'Tasks', 'Targets',
                        ].map((item) => (
                            <p key={item} style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13" style={{ color: 'var(--success)', flexShrink: 0 }}>
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                {item}
                            </p>
                        ))}
                    </div>
                </div>

                {/* Backup history */}
                <div className="card" style={{ padding: 0 }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600 }}>Backup History</h3>
                    </div>
                    <div className="table-container" style={{ border: 'none' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Date & Time</th>
                                    <th>Filename</th>
                                    <th>Records</th>
                                    <th>Size</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyLoading ? (
                                    <tr><td colSpan="5">
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                                            <div className="spinner" />
                                        </div>
                                    </td></tr>
                                ) : history.length === 0 ? (
                                    <tr><td colSpan="5">
                                        <div className="empty-state">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="7 10 12 15 17 10" />
                                                <line x1="12" y1="15" x2="12" y2="3" />
                                            </svg>
                                            <h3>No backups yet</h3>
                                            <p>Download your first backup using the button above</p>
                                        </div>
                                    </td></tr>
                                ) : history.map((b) => {
                                    const total = Object.values(b.counts || {}).reduce((s, n) => s + n, 0)
                                    return (
                                        <tr key={b._id}>
                                            <td style={{ fontSize: 13 }}>
                                                {new Date(b.createdAt).toLocaleString('en-IN', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit',
                                                })}
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                                {b.filename}
                                            </td>
                                            <td style={{ fontSize: 13 }}>
                                                {total} records
                                            </td>
                                            <td style={{ fontSize: 13 }}>{formatSize(b.sizeBytes)}</td>
                                            <td>
                                                <span className="badge badge-success">success</span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}

export default Backup