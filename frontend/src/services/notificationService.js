import API from '../utils/api'

export const notificationService = {
    // Returns { success, data: [...], unreadCount }
    getMine: async () => {
        const res = await API.get('/notifications')
        return res.data
    },

    markAllRead: async () => {
        const res = await API.patch('/notifications/read-all')
        return res.data
    },

    markRead: async (id) => {
        const res = await API.patch(`/notifications/${id}/read`)
        return res.data
    },

    delete: async (id) => {
        const res = await API.delete(`/notifications/${id}`)
        return res.data
    },
}
