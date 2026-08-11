import prisma from '../utils/prismaClient.js';

export const authRepository = {
  findAdminByEmail: async (email) => prisma.admin.findUnique({ where: { email } }),
};
