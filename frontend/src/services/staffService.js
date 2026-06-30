import API from '../utils/api'

export const staffService = {
    getAll: async () => {
        const res = await API.get('/staff')
        return res.data
    },

    create: async (data) => {
        const res = await API.post('/staff', data)
        return res.data
    },

    update: async (id, data) => {
        const res = await API.put(`/staff/${id}`, data)
        return res.data
    },

    delete: async (id) => {
        const res = await API.delete(`/staff/${id}`)
        return res.data
    },

    getRoleDefaults: async (role) => {
        const res = await API.get(`/staff/role-defaults/${role}`)
        return res.data
    },
}