const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export function resolveImageUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/uploads/')) return `${API_ORIGIN}${url}`;
  return url;
}
