#!/usr/bin/env node
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

// One-off script to upsert an Admin account using env vars ADMIN_EMAIL and ADMIN_PASSWORD
// Safety rules enforced:
// - Never print ADMIN_PASSWORD or password hash
// - Use bcrypt with 10 salt rounds (same as existing seed)
// - Read DATABASE_URL from environment (do not modify it)
// - Print only a success message on success

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set');
    process.exitCode = 2;
    return;
  }

  const prisma = new PrismaClient();
  try {
    // Hash password with 10 rounds (same as repo's seed)
    const hash = await bcrypt.hash(password, 10);

    // Upsert admin by email: update only passwordHash when exists; create when absent
    await prisma.admin.upsert({
      where: { email },
      update: { passwordHash: hash },
      create: { email, passwordHash: hash },
    });

    // On success, print only the required message
    console.log('Admin account upserted successfully.');
  } catch (err) {
    // Avoid printing sensitive details. Print a concise error message for operator.
    console.error('Failed to upsert admin account:', err && err.message ? err.message : String(err));
    process.exitCode = 1;
  } finally {
    // Ensure Prisma disconnects
    try {
      await prisma.$disconnect();
    } catch (_) {}
  }
}

// Execute when run directly
if (import.meta.url === `file://${process.cwd()}/backend/scripts/upsert-admin.js`) {
  main().catch((err) => {
    console.error('Unexpected error:', err && err.message ? err.message : String(err));
    process.exitCode = 1;
  });
}
export default main;
