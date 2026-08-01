import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Nettoyage ponctuel : supprime l'enceinte de test "n", renomme "Grand Stade
 * Hassan II" en "Stade de Casablanca" et remet tous ses sièges à AVAILABLE
 * (les anciens billets/commandes qui les avaient marqués SOLD sont effacés
 * dans les autres services, mais ce statut est stocké ici séparément). */
async function main() {
  const venues = await prisma.venue.findMany();
  const junk = venues.find((v) => v.name === 'n');
  const keep = venues.find((v) => v.name === 'Grand Stade Hassan II');

  if (junk) {
    await prisma.venue.delete({ where: { id: junk.id } });
    console.log(`Enceinte de test "n" supprimée (${junk.id}).`);
  }

  if (!keep) {
    throw new Error('Enceinte "Grand Stade Hassan II" introuvable — rien à renommer.');
  }

  await prisma.venue.update({ where: { id: keep.id }, data: { name: 'Stade de Casablanca' } });
  console.log(`Enceinte ${keep.id} renommée en "Stade de Casablanca".`);

  const reset = await prisma.seat.updateMany({
    where: { row: { zone: { stand: { venueId: keep.id } } } },
    data: { status: 'AVAILABLE' },
  });
  console.log(`Sièges remis à AVAILABLE : ${reset.count}`);
}

main()
  .catch((err) => {
    console.error('ERREUR:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
