const explicitApiBase = import.meta.env.VITE_API_BASE_URL?.trim() || import.meta.env.VITE_API_URL?.trim() || '';
const explicitApiBaseNormalized = explicitApiBase.replace(/\/+$|\s+$/g, '');

function isAbsoluteUrl(url) {
  return /^https?:\/\//i.test(url);
}

function getWindowOrigin() {
  if (typeof window === 'undefined' || !window.location) return '';
  return window.location.origin || `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`;
}

function getFallbackApiBaseUrl() {
  if (typeof window === 'undefined' || !window.location) return '';
  const { protocol, hostname } = window.location;
  if (!hostname) return '';
  return `${protocol}//${hostname}:5001`;
}

export function getApiBaseUrl() {
  if (explicitApiBaseNormalized) return explicitApiBaseNormalized;
  return getFallbackApiBaseUrl();
}

export function getApiBasePath() {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return '/api';
  if (apiBaseUrl.endsWith('/api')) return apiBaseUrl;
  return `${apiBaseUrl.replace(/\/+$/, '')}/api`;
}

export function resolveApiUrl(path = '') {
  if (!path) return getApiBaseUrl();
  if (isAbsoluteUrl(path)) return path;
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return path;
  if (path.startsWith('/')) {
    return `${apiBaseUrl.replace(/\/+$/, '')}${path}`;
  }
  return `${apiBaseUrl.replace(/\/+$/, '')}/${path}`;
}

export function getBackendOrigin() {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return '';
  if (isAbsoluteUrl(apiBaseUrl)) {
    return apiBaseUrl.replace(/\/api\/?$/, '');
  }
  return getWindowOrigin();
}

export function getSocketUrl() {
  const explicitSocket = import.meta.env.VITE_SOCKET_URL?.trim() || '';
  if (explicitSocket) return explicitSocket.replace(/\/+$/, '');

  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return getFallbackApiBaseUrl();
  if (isAbsoluteUrl(apiBaseUrl)) {
    return apiBaseUrl.replace(/\/api\/?$/, '');
  }
  return getFallbackApiBaseUrl();
}
