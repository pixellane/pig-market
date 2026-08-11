import prisma from './prismaClient.js';

const sampleProducts = [
  {
    name: 'Pork Chop',
    description: 'A tender pork chop cut from the loin, ideal for grilling or pan-searing with rich, juicy flavor.',
    pricePerKg: 250.0,
    stockKg: 35.0,
    imageUrl: '/images/pork-chop.svg',
    isActive: true,
  },
  {
    name: 'Pork Belly',
    description: 'A rich and succulent pork belly cut with layered fat and meat, perfect for slow roasting or crisping into crackling.',
    pricePerKg: 300.0,
    stockKg: 25.0,
    imageUrl: '/images/pork-belly.svg',
    isActive: true,
  },
  {
    name: 'Pork Shoulder',
    description: 'A flavorful pork shoulder perfect for braising, pulled pork, or slow-cooked BBQ.',
    pricePerKg: 220.0,
    stockKg: 40.0,
    imageUrl: '/images/pork-chop.svg',
    isActive: true,
  },
  {
    name: 'Pork Ribs',
    description: 'Hearty pork ribs with rich flavor, great for barbecuing or slow smoking until tender.',
    pricePerKg: 280.0,
    stockKg: 20.0,
    imageUrl: '/images/pork-ribs.svg',
    isActive: true,
  },
  {
    name: 'Pork Loin',
    description: 'A lean and versatile pork loin cut that stays juicy when roasted or sliced into elegant chops.',
    pricePerKg: 260.0,
    stockKg: 18.0,
    imageUrl: '/images/pork-loin.svg',
    isActive: true,
  },
  {
    name: 'Pork Tenderloin',
    description: 'A silky-soft pork tenderloin that is lean, quick to cook, and excellent for simple pan-seared meals.',
    pricePerKg: 320.0,
    stockKg: 12.0,
    imageUrl: '/images/pork-tenderloin.svg',
    isActive: true,
  },
  {
    name: 'Ham',
    description: 'A classic ham cut with balanced flavor, ideal for roasting, sandwiches, or holiday meals.',
    pricePerKg: 240.0,
    stockKg: 10.0,
    imageUrl: '/images/ham.svg',
    isActive: true,
  },
];

export async function seedProductsIfEmpty() {
  const count = await prisma.product.count();
  if (count > 0) {
    return;
  }

  for (const product of sampleProducts) {
    await prisma.product.create({ data: product });
    console.log(`Created product ${product.name}.`);
  }
}
