import { getBackendOrigin } from './apiUrl.js';

export function resolveImageUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/uploads/')) {
    const apiOrigin = getBackendOrigin();
    if (!apiOrigin || !/^https?:\/\//i.test(apiOrigin)) {
      return url;
    }
    return `${apiOrigin}${url}`;
  }
  return url;
}
