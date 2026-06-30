// This file used to be a second, parallel axios instance. That caused
// sync issues with localStorage token storage. Now it re-exports the
// single API client from utils/api.js so both import paths resolve
// to the same axios instance.

import API, {
    setAccessToken,
    getAccessToken,
    clearAccessToken,
} from '../utils/api'

export { setAccessToken, getAccessToken, clearAccessToken }
export default API
