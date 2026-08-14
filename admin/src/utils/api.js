import axios from 'axios';

const envBase = import.meta.env.VITE_API_BASE_URL?.trim();
const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const productionBackendOrigin = 'https://pig-market.onrender.com';
const defaultOrigin = typeof window !== 'undefined'
  ? (isLocalHost ? 'http://localhost:5001' : (import.meta.env.PROD ? productionBackendOrigin : window.location.origin))
  : '';
const defaultBase = defaultOrigin ? `${defaultOrigin}/api` : '/api';
const API_BASE = envBase || defaultBase;
const API_ORIGIN = envBase ? envBase.replace(/\/api\/?$/, '') : defaultOrigin;

export const api = axios.create({ baseURL: API_BASE });

// Global response handler: if a request returns 401, clear the stored admin
// token and force a reload to the login page to avoid endless retries.
if (typeof window !== 'undefined') {
  api.interceptors.response.use(
    (resp) => resp,
    (err) => {
      const status = err?.response?.status;
      if (status === 401) {
        try {
          localStorage.removeItem('pigmarket-admin-token');
          // Redirect to login page to obtain a fresh token
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        } catch (e) {
          // swallow errors during cleanup
        }
      }
      return Promise.reject(err);
    }
  );
}
export function getAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('pigmarket-admin-token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export { API_ORIGIN };
