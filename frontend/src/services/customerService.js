import API from '../utils/api'

export const customerService = {
    getAll: async (params = {}) => {
        const res = await API.get('/customers', { params })
        return res.data
    },

    getById: async (id) => {
        const res = await API.get(`/customers/${id}`)
        return res.data
    },

    create: async (data) => {
        const res = await API.post('/customers', data)
        return res.data
    },

    update: async (id, data) => {
        const res = await API.put(`/customers/${id}`, data)
        return res.data
    },

    delete: async (id) => {
        const res = await API.delete(`/customers/${id}`)
        return res.data
    },

    // ─── Invitations & approvals (Batch 21) ────────────────────
    invite: async (id) => {
        const res = await API.post(`/customers/${id}/invite`)
        return res.data
    },

    getPendingApprovals: async () => {
        const res = await API.get('/customers/pending-approvals')
        return res.data
    },

    approve: async (userId) => {
        const res = await API.post(`/customers/pending-approvals/${userId}/approve`)
        return res.data
    },

    reject: async (userId) => {
        const res = await API.post(`/customers/pending-approvals/${userId}/reject`)
        return res.data
    },
}