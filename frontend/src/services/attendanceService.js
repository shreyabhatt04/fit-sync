import API from '../utils/api'

export const attendanceService = {
  getAll: async (params = {}) => {
    const res = await API.get('/attendance', { params })
    return res.data
  },

  mark: async (records) => {
    const res = await API.post('/attendance', { records })
    return res.data
  },

  getSummary: async (month) => {
    const res = await API.get('/attendance/summary', { params: { month } })
    return res.data
  },
}