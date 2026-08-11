import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Database update script started.");

  // 1. Delete test products
  const testNames = [
    'Curl Test Pork',
    'Curl Test Pork 2',
    'Temp Pork',
    'Temp Pork2',
    'Temp Pork3',
    'Smoke Test Pork'
  ];
  
  const deleteResult = await prisma.product.deleteMany({
    where: {
      name: {
        in: testNames
      }
    }
  });
  console.log(`Deleted ${deleteResult.count} test products.`);

  // 2. Update imageUrl from .svg to .jpg
  const products = await prisma.product.findMany();
  let updatedCount = 0;
  for (const p of products) {
    let updatedImageUrl = p.imageUrl;
    let needsUpdate = false;

    if (p.imageUrl.endsWith('.svg')) {
      updatedImageUrl = p.imageUrl.replace('.svg', '.jpg');
      needsUpdate = true;
    }
    
    // Specifically fix Pork Shoulder if it didn't get mapped correctly
    if (p.name === 'Pork Shoulder' && p.imageUrl !== '/images/pork-shoulder.jpg') {
      updatedImageUrl = '/images/pork-shoulder.jpg';
      needsUpdate = true;
    }

    if (needsUpdate) {
      await prisma.product.update({
        where: { id: p.id },
        data: { imageUrl: updatedImageUrl }
      });
      console.log(`Updated image for product '${p.name}': ${p.imageUrl} -> ${updatedImageUrl}`);
      updatedCount++;
    }
  }
  console.log(`Updated imageUrl for ${updatedCount} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("Database update script completed.");
  });
