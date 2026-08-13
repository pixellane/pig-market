import { z } from 'zod';
import { authService } from '../services/authService.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function login(req, res, next) {
  try {
    const payload = loginSchema.parse(req.body);
    const token = await authService.login(payload);
    return res.json({ token });
  } catch (err) {
    // Invalid credentials should return 401 Unauthorized instead of 500
    if (err && err.message === 'Invalid credentials') {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // ZodError and other errors are handled by global error handler — forward unexpected errors
    return next(err);
  }
}
