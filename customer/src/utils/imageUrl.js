import { getBackendOrigin } from './apiUrl.js';

export function resolveImageUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/uploads/')) {
    const apiOrigin = getBackendOrigin();
    if (!apiOrigin || !/^https?:\/\//i.test(apiOrigin)) {
      return url;
    }
    // If the backend origin is the default development fallback on port 5001,
    // prefer the browser's current origin so we don't point to a non-routable
    // or unavailable port in production builds (Render uses same host without :5001).
    try {
      const apiUrl = new URL(apiOrigin);
      if (apiUrl.port === '5001' && typeof window !== 'undefined' && window.location && window.location.origin) {
        return `${window.location.origin}${url}`;
      }
    } catch (e) {
      // Fall back to using apiOrigin if URL parsing fails
    }
    return `${apiOrigin}${url}`;
  }
  return url;
}
