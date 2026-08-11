import { z } from 'zod';
import { authService } from '../services/authService.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function login(req, res) {
  const payload = loginSchema.parse(req.body);
  const token = await authService.login(payload);
  res.json({ token });
}
