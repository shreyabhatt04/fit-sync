import API from '../utils/api'

export const enquiryService = {
    getAll: async (params = {}) => {
        const res = await API.get('/enquiries', { params })
        return res.data
    },
    getStats: async () => {
        const res = await API.get('/enquiries/stats')
        return res.data
    },
    create: async (data) => {
        const res = await API.post('/enquiries', data)
        return res.data
    },
    update: async (id, data) => {
        const res = await API.put(`/enquiries/${id}`, data)
        return res.data
    },
    delete: async (id) => {
        const res = await API.delete(`/enquiries/${id}`)
        return res.data
    },
}