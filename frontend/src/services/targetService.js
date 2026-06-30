import API from '../utils/api'

export const targetService = {
    getAll: async () => {
        const res = await API.get('/targets')
        return res.data
    },
    create: async (data) => {
        const res = await API.post('/targets', data)
        return res.data
    },
    update: async (id, data) => {
        const res = await API.put(`/targets/${id}`, data)
        return res.data
    },
    delete: async (id) => {
        const res = await API.delete(`/targets/${id}`)
        return res.data
    },
}