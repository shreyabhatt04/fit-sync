import API from '../utils/api'

export const taskService = {
    getAll: async () => {
        const res = await API.get('/tasks')
        return res.data
    },
    create: async (data) => {
        const res = await API.post('/tasks', data)
        return res.data
    },
    update: async (id, data) => {
        const res = await API.put(`/tasks/${id}`, data)
        return res.data
    },
    move: async (id, status) => {
        const res = await API.put(`/tasks/${id}/move`, { status })
        return res.data
    },
    delete: async (id) => {
        const res = await API.delete(`/tasks/${id}`)
        return res.data
    },
}