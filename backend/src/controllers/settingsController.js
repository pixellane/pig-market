import { z } from 'zod';
import { readStoreSettings, writeStoreSettings, weekdayNames, defaultOpeningHours } from '../utils/storeSettings.js';
import { emitSettingsUpdate } from '../realtime/adminRealtime.js';

const timeStringSchema = z.string().trim().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'Invalid time format');

const openingHoursEntrySchema = z.object({
  open: z.boolean().default(false),
  openTime: z.string().trim().default('08:00'),
  closeTime: z.string().trim().default('18:00'),
}).superRefine((entry, ctx) => {
  if (!entry.open) return;
  if (!timeStringSchema.safeParse(entry.openTime).success) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Opening time must be in HH:MM format.', path: ['openTime'] });
  }
  if (!timeStringSchema.safeParse(entry.closeTime).success) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Closing time must be in HH:MM format.', path: ['closeTime'] });
  }
});

const openingHoursSchema = z.object(
  Object.fromEntries(weekdayNames.map((day) => [day, openingHoursEntrySchema]))
).default(defaultOpeningHours);

const settingsSchema = z.object({
  storeName: z.string().trim().min(1, 'Store name is required.'),
  contactNumber: z.string().trim().min(1, 'Contact number is required.'),
  email: z.string().trim().email('A valid email is required.'),
  address: z.string().trim().min(1, 'Address is required.'),
  businessHours: z.string().trim().min(1, 'Business hours are required.').optional().or(z.literal('')),
  deliveryInformation: z.string().trim().optional().default(''),
  facebookUrl: z.string().trim().min(1, 'Facebook URL is required.').url('Please enter a valid Facebook URL.'),
  openingHours: openingHoursSchema.optional(),
});

export async function getStoreSettings(req, res) {
  res.json(await readStoreSettings());
}

export async function updateStoreSettings(req, res) {
  const parsed = settingsSchema.parse(req.body);
  const updatedSettings = await writeStoreSettings(parsed);
  
  // Emit real-time update to all connected clients
  emitSettingsUpdate(updatedSettings);
  
  res.json(updatedSettings);
}
