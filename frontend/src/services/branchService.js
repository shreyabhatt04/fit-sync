import API from '../utils/api'

export const branchService = {
    getAll: async () => {
        const res = await API.get('/branches')
        return res.data
    },

    create: async (data) => {
        const res = await API.post('/branches', data)
        return res.data
    },

    update: async (id, data) => {
        const res = await API.put(`/branches/${id}`, data)
        return res.data
    },

    delete: async (id) => {
        const res = await API.delete(`/branches/${id}`)
        return res.data
    },

    setMain: async (id) => {
        const res = await API.put(`/branches/${id}/set-main`)
        return res.data
    },
}