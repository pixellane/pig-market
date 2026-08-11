export function normalizePhilippineNumber(input) {
  if (!input || typeof input !== 'string') return null;
  const cleaned = input.replace(/[^0-9+]/g, '').replace(/^\+/, ''); // remove non-digits, keep leading plus removed
  if (!cleaned) return null;
  // If starts with '63' (country code), convert to leading 0
  if (cleaned.startsWith('63')) {
    const rest = cleaned.slice(2);
    if (rest.length === 10 && /^9\d{9}$/.test(rest)) return '0' + rest;
    if (rest.length === 9 && /^9\d{8}$/.test(rest)) return '0' + rest; // defensive
  }
  // If starts with '9' (no leading zero), prepend 0
  if (/^9\d{9}$/.test(cleaned)) return '0' + cleaned;
  // If starts with '0' and has 11 digits, accept
  if (/^0\d{10}$/.test(cleaned)) return cleaned;
  return null;
}

export function isValidPhilippineNumber(input) {
  return normalizePhilippineNumber(input) !== null;
}
