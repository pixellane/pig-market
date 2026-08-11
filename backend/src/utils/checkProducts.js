import prisma from './prismaClient.js';

(async function main(){
  try{
    const p = await prisma.product.findMany();
    console.log('count', p.length);
    console.log(p.map(x=>x.name));
  }catch(e){
    console.error(e);
    process.exit(1);
  }finally{
    await prisma.$disconnect();
  }
})();
