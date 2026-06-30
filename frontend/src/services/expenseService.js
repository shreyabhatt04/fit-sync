import API from '../utils/api'

export const expenseService = {
  getAll: async (params = {}) => {
    const res = await API.get('/expenses', { params })
    return res.data
  },
  getStats: async () => {
    const res = await API.get('/expenses/stats')
    return res.data
  },
  create: async (data) => {
    const res = await API.post('/expenses', data)
    return res.data
  },
  update: async (id, data) => {
    const res = await API.put(`/expenses/${id}`, data)
    return res.data
  },
  delete: async (id) => {
    const res = await API.delete(`/expenses/${id}`)
    return res.data
  },
}