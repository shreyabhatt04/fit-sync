// Format currency in Indian Rupees
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount)
}

// Format date to readable string
export const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
}

// Get initials from full name
export const getInitials = (name) => {
    if (!name) return '?'
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

// Get days remaining until a date
export const daysUntil = (dateStr) => {
    const today = new Date()
    const target = new Date(dateStr)
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24))
    return diff
}

// Truncate long text
export const truncate = (str, length = 30) => {
    if (!str) return ''
    return str.length > length ? str.slice(0, length) + '...' : str
}

// Get status badge class
export const getStatusClass = (status) => {
    const map = {
        active: 'badge-success',
        expired: 'badge-danger',
        pending: 'badge-warning',
        cancelled: 'badge-gray',
        paid: 'badge-success',
        due: 'badge-warning',
        overdue: 'badge-danger',
        completed: 'badge-success',
        converted: 'badge-success',
        lost: 'badge-danger',
        new: 'badge-info',
        'follow-up': 'badge-warning',
        present: 'badge-success',
        absent: 'badge-danger',
        high: 'badge-danger',
        medium: 'badge-warning',
        low: 'badge-info',
    }
    return map[status?.toLowerCase()] || 'badge-gray'
}