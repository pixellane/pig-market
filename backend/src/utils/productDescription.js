const templates = {
  default: [
    'A premium pork cut with rich flavor and a tender texture, perfect for everyday meals.',
    'Fresh pork with balanced marbling — versatile for roasting, grilling, or pan-searing.',
    'High-quality pork cut: flavorful, tender, and easy to prepare for family dinners.',
  ],
  'pork chop': [
    'A tender pork chop from the loin — great for grilling or pan-searing to juicy perfection.',
    'Lean and flavorful pork chops, excellent for quick weeknight meals or weekend grilling.',
  ],
  'pork belly': [
    'Succulent pork belly with layered fat and meat — ideal for slow roasting or crisp crackling.',
    'Rich pork belly perfect for braising, roasting, or making crispy slices for sandwiches.',
  ],
  'pork shoulder': [
    'Well-marbled pork shoulder, perfect for slow-cooked pulled pork and hearty stews.',
    'A flavorful shoulder cut that shines when braised or smoked for tender results.',
  ],
  'pork ribs': [
    'Hearty pork ribs for barbecuing or slow smoking until fall-off-the-bone tender.',
    'Ribs with rich flavor and satisfying texture — perfect for sauces and long cooks.',
  ],
  'pork loin': [
    'Lean pork loin that stays juicy when roasted; slice into chops or serve whole.',
    'Versatile pork loin, great roasted or cut into elegant medallions for quick meals.',
  ],
  'pork tenderloin': [
    'Silky-soft pork tenderloin — lean, quick to cook, and excellent for pan-searing.',
    'Tenderloin that delivers delicate, mild-flavored meat for elegant weeknight dinners.',
  ],
  ham: [
    'Classic ham with balanced flavor — great for roasting, sandwiches, and special occasions.',
  ],
  leg: [
    'Hearty pork leg ideal for slow roasting and carving into savory portions for gatherings.',
  ],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateProductDescription(name) {
  const normalized = (name || '').trim().toLowerCase();
  if (!normalized) return pick(templates.default);

  for (const key of Object.keys(templates)) {
    if (key !== 'default' && normalized.includes(key)) {
      return pick(templates[key]);
    }
  }

  return `A premium pork cut: ${name.trim()}, ${pick(templates.default)}`;
}
