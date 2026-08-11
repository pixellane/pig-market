import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authRepository } from '../repositories/authRepository.js';

export const authService = {
  login: async ({ email, password }) => {
    const admin = await authRepository.findAdminByEmail(email);
    if (!admin) throw new Error('Invalid credentials');
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new Error('Invalid credentials');
    return jwt.sign({ adminId: admin.id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
  },
};
