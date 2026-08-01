import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Nettoyage ponctuel : efface toutes les commandes (cascade sur order_items). */
async function main() {
  const orders = await prisma.order.deleteMany({});
  console.log(`Commandes supprimées : ${orders.count}`);
}

main()
  .catch((err) => {
    console.error('ERREUR:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
