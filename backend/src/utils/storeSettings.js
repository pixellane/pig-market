import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data');
const settingsPath = path.join(dataDirectory, 'storeSettings.json');

export const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const defaultOpeningHours = Object.fromEntries(
  weekdayNames.map((day) => [
    day,
    {
      open: false,
      openTime: '08:00',
      closeTime: '18:00',
    },
  ])
);

export const defaultStoreSettings = {
  storeName: 'Fresh Pork Market',
  contactNumber: '09171234567',
  email: 'freshporkmarket@example.com',
  address: 'Opol, Misamis Oriental',
  businessHours: '',
  deliveryInformation: 'Local delivery available within the service area.',
  facebookUrl: 'https://www.facebook.com',
  openingHours: { ...defaultOpeningHours },
};

function normalizeOpeningHours(input = {}) {
  return Object.fromEntries(
    weekdayNames.map((day) => {
      const current = input?.[day] || {};
      const isOpen = Boolean(current.open);
      return [day, {
        open: isOpen,
        openTime: isOpen ? (current.openTime || '08:00') : '08:00',
        closeTime: isOpen ? (current.closeTime || '18:00') : '18:00',
      }];
    })
  );
}

export function normalizeStoreSettings(settings = {}) {
  const openingHours = normalizeOpeningHours(settings.openingHours || defaultOpeningHours);
  const next = {
    ...defaultStoreSettings,
    ...settings,
    openingHours,
  };

  // Keep an explicitly empty businessHours string — do not auto-fill weekday times
  if (next.businessHours === '[Business hours]') {
    next.businessHours = '';
  }
  if (typeof next.businessHours !== 'string') {
    next.businessHours = '';
  }

  return next;
}

export async function readStoreSettings() {
  try {
    const contents = await fs.readFile(settingsPath, 'utf8');
    return normalizeStoreSettings(JSON.parse(contents));
  } catch {
    return normalizeStoreSettings();
  }
}

export async function writeStoreSettings(settings) {
  await fs.mkdir(dataDirectory, { recursive: true });
  const next = normalizeStoreSettings(settings);
  await fs.writeFile(settingsPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}
