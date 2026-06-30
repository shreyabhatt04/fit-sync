import API from '../utils/api'

export const gymStaffService = {
    getAll: async (params = {}) => {
        const res = await API.get('/gym-staff', { params })
        return res.data
    },
    getTrainers: async () => {
        const res = await API.get('/gym-staff/trainers')
        return res.data
    },
    // Payroll for all active trainers — returns base salary + PT component +
    // computed total per trainer. Backend does the math.
    getPayroll: async () => {
        const res = await API.get('/gym-staff/payroll')
        return res.data
    },
    getById: async (id) => {
        const res = await API.get(`/gym-staff/${id}`)
        return res.data
    },
    create: async (data) => {
        const res = await API.post('/gym-staff', data)
        return res.data
    },
    update: async (id, data) => {
        const res = await API.put(`/gym-staff/${id}`, data)
        return res.data
    },
    delete: async (id) => {
        const res = await API.delete(`/gym-staff/${id}`)
        return res.data
    },

    // Upload health-insurance document (PDF/JPG/PNG, max 5 MB).
    // Important: do NOT set Content-Type manually — axios will fill in the
    // correct multipart boundary when given a FormData instance.
    uploadDocument: async (id, file) => {
        const fd = new FormData()
        fd.append('document', file)
        const res = await API.post(`/gym-staff/${id}/document`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return res.data
    },

    removeDocument: async (id) => {
        const res = await API.delete(`/gym-staff/${id}/document`)
        return res.data
    },
}
