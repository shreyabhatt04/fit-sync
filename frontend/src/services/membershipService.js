import API from '../utils/api'

export const membershipService = {
    getAll: async () => {
        const res = await API.get('/memberships')
        return res.data
    },

    create: async (data) => {
        const res = await API.post('/memberships', data)
        return res.data
    },

    update: async (id, data) => {
        const res = await API.put(`/memberships/${id}`, data)
        return res.data
    },

    delete: async (id) => {
        const res = await API.delete(`/memberships/${id}`)
        return res.data
    },
}