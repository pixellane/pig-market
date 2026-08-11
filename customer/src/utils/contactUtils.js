export function normalizePhilippineNumber(input) {
  if (!input || typeof input !== 'string') return null;
  const cleaned = input.replace(/[^0-9+]/g, '').replace(/^\+/, '');
  if (!cleaned) return null;
  if (cleaned.startsWith('63')) {
    const rest = cleaned.slice(2);
    if (/^9\d{9}$/.test(rest)) return '0' + rest;
  }
  if (/^9\d{9}$/.test(cleaned)) return '0' + cleaned;
  if (/^0\d{10}$/.test(cleaned)) return cleaned;
  return null;
}
export function isValidPhilippineNumber(input) { return normalizePhilippineNumber(input) !== null; }
