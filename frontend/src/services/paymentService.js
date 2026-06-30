import API from '../utils/api'

export const paymentService = {
    getAll: async (params = {}) => {
        const res = await API.get('/payments', { params })
        return res.data
    },

    create: async (data) => {
        const res = await API.post('/payments', data)
        return res.data
    },

    getDue: async () => {
        const res = await API.get('/payments/due')
        return res.data
    },

    getStats: async () => {
        const res = await API.get('/payments/stats')
        return res.data
    },

    // Download a PDF invoice. Triggers a save dialog by creating a temporary
    // <a download> link from the returned blob. `copy` is 'customer' (default)
    // or 'owner' — admins can request either; customers always get the
    // customer copy regardless of what they pass.
    downloadInvoicePdf: async (id, copy = 'customer', filename) => {
        const res = await API.get(`/payments/${id}/pdf`, {
            params: { copy },
            responseType: 'blob',
        })
        const blob = new Blob([res.data], { type: 'application/pdf' })
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href = url
        a.download = filename || `invoice-${id}-${copy}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        // Free the blob URL on the next tick so the browser has a chance
        // to start the download before we revoke it.
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
}
