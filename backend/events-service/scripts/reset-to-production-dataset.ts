import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Nettoyage ponctuel : efface abonnements, formules, événements (cascade sur
 * price_rules/sales_quotas/subscription_formula_events) et catégories de billets. */
async function main() {
  const subs = await prisma.subscription.deleteMany({});
  console.log(`Abonnements supprimés : ${subs.count}`);

  const formulas = await prisma.subscriptionFormula.deleteMany({});
  console.log(`Formules d'abonnement supprimées : ${formulas.count}`);

  const events = await prisma.event.deleteMany({});
  console.log(`Événements supprimés (cascade tarifs/jauges) : ${events.count}`);

  const cats = await prisma.ticketCategory.deleteMany({});
  console.log(`Catégories de billets supprimées : ${cats.count}`);
}

main()
  .catch((err) => {
    console.error('ERREUR:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
