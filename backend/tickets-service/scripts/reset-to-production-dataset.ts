import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Nettoyage ponctuel : efface tous les billets générés puis tous les gabarits (dans cet ordre —
 * GeneratedTicket.template est en onDelete: Restrict). */
async function main() {
  const tickets = await prisma.generatedTicket.deleteMany({});
  console.log(`Billets générés supprimés : ${tickets.count}`);

  const templates = await prisma.ticketTemplate.deleteMany({});
  console.log(`Gabarits de billets supprimés : ${templates.count}`);
}

main()
  .catch((err) => {
    console.error('ERREUR:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
