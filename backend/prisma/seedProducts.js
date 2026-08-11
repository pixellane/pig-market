import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.product.count();
  if (count > 0) {
    console.log('Products already exist; skipping seed.');
    return;
  }

  const sampleProducts = [
    {
      name: 'Pork Chop',
      description: 'Juicy pork chop, perfect for grilling.',
      pricePerKg: 250.0,
      stockKg: 35.0,
      imageUrl: '/images/pork-chop.svg',
      isActive: true,
    },
    {
      name: 'Pork Belly',
      description: 'Rich and flavorful pork belly slices.',
      pricePerKg: 300.0,
      stockKg: 25.0,
      imageUrl: '/images/pork-belly.svg',
      isActive: true,
    },
  ];

  for (const product of sampleProducts) {
    await prisma.product.create({ data: product });
    console.log(`Created product ${product.name}.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
