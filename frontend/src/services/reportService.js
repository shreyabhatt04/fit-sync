import API from '../utils/api'

export const reportService = {
    getDashboardStats: async () => {
        const res = await API.get('/reports/dashboard')
        return res.data
    },

    getFinancialReport: async () => {
        const res = await API.get('/reports/financial')
        return res.data
    },

    // GST reports — Batch 15 (guide feedback #9c).
    // params: { from, to, previewRate } — all optional
    getGstr1: async (params = {}) => {
        const res = await API.get('/reports/gstr1', { params })
        return res.data
    },
    getGstr2: async (params = {}) => {
        const res = await API.get('/reports/gstr2', { params })
        return res.data
    },

    // CSV download helpers — trigger a save dialog.
    downloadGstr1Csv: async (params = {}) => {
        const res = await API.get('/reports/gstr1.csv', { params, responseType: 'blob' })
        const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
        const a = document.createElement('a')
        a.href = url
        a.download = `gstr1-${params.from || 'all'}-to-${params.to || 'now'}.csv`
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
    downloadGstr2Csv: async (params = {}) => {
        const res = await API.get('/reports/gstr2.csv', { params, responseType: 'blob' })
        const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
        const a = document.createElement('a')
        a.href = url
        a.download = `gstr2-${params.from || 'all'}-to-${params.to || 'now'}.csv`
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
}
