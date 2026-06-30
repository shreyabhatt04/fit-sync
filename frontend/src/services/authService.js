import API from '../utils/api'

export const authService = {
    register: async (data) => {
        const res = await API.post('/auth/register', data)
        return res.data
    },

    login: async (email, password) => {
        const res = await API.post('/auth/login', { email, password })
        return res.data
    },

    getMe: async () => {
        const res = await API.get('/auth/me')
        return res.data
    },

    updateProfile: async (data) => {
        const res = await API.put('/auth/profile', data)
        return res.data
    },

    changePassword: async (data) => {
        const res = await API.put('/auth/change-password', data)
        return res.data
    },
}