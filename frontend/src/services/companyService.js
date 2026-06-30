import API from '../utils/api'

export const companyService = {
    // Admin/staff: fetch the company they belong to
    getMine: async () => {
        const res = await API.get('/companies/me')
        return res.data
    },

    // Admin only: update their own company (My Business page)
    updateMine: async (data) => {
        const res = await API.put('/companies/me', data)
        return res.data
    },

    // Admin only: upload/replace gym logo. Pass a File from a <input type="file">.
    // Server returns the updated Company doc.
    uploadLogo: async (file) => {
        const fd = new FormData()
        fd.append('logo', file)
        // Don't set Content-Type manually — axios sets the multipart
        // boundary automatically when given FormData.
        const res = await API.post('/companies/me/logo', fd)
        return res.data
    },

    // Admin only: clear the gym logo. Idempotent on the server side.
    removeLogo: async () => {
        const res = await API.delete('/companies/me/logo')
        return res.data
    },

    // Admin/staff/customer: lightweight payment info (bank + UPI) for QR
    // and invoice rendering. Omits owner PII and platform metadata.
    getPaymentInfo: async () => {
        const res = await API.get('/companies/payment-info')
        return res.data
    },

    // Superadmin: list all companies
    getAll: async (params = {}) => {
        const res = await API.get('/companies', { params })
        return res.data
    },

    // Superadmin: get a single company by id
    getById: async (id) => {
        const res = await API.get(`/companies/${id}`)
        return res.data
    },

    // Superadmin: update a company by id
    update: async (id, data) => {
        const res = await API.put(`/companies/${id}`, data)
        return res.data
    },

    // Superadmin: change status (active / suspended / etc.)
    setStatus: async (id, status) => {
        const res = await API.patch(`/companies/${id}/status`, { status })
        return res.data
    },

    // Superadmin: enable/disable modules for a company
    updateModules: async (id, modules) => {
        const res = await API.patch(`/companies/${id}/modules`, { modules })
        return res.data
    },
}
