import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 10);
  await prisma.admin.upsert({
    where: { email: 'admin@pigmarket.local' },
    update: { passwordHash: hash },
    create: { email: 'admin@pigmarket.local', passwordHash: hash },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
