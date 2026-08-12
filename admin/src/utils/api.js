import axios from 'axios';

const envBase = import.meta.env.VITE_API_BASE_URL?.trim();
const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const defaultOrigin = typeof window !== 'undefined'
  ? (isLocalHost ? 'http://localhost:5001' : window.location.origin)
  : '';
const defaultBase = defaultOrigin ? `${defaultOrigin}/api` : '/api';
const API_BASE = envBase || defaultBase;
const API_ORIGIN = envBase ? envBase.replace(/\/api\/?$/, '') : defaultOrigin;

export const api = axios.create({ baseURL: API_BASE });

export function getAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('pigmarket-admin-token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export { API_ORIGIN };
