import API from '../utils/api'

export const subscriptionService = {
    getAll: async (params = {}) => {
        const res = await API.get('/subscriptions', { params })
        return res.data
    },

    create: async (data) => {
        const res = await API.post('/subscriptions', data)
        return res.data
    },

    update: async (id, data) => {
        const res = await API.put(`/subscriptions/${id}`, data)
        return res.data
    },

    getUpcomingRenewals: async () => {
        const res = await API.get('/subscriptions/renewals/upcoming')
        return res.data
    },
}