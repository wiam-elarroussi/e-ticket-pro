import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Nettoyage ponctuel : garde uniquement le compte Super Admin, efface tout le reste
 * (sessions, logs d'audit, canaux de vente, quotas partenaires, autres utilisateurs). */
async function main() {
  const admin = await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } });

  await prisma.session.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.partner.updateMany({ data: { archivedById: null } });
  await prisma.user.updateMany({ data: { createdById: null } });
  await prisma.partnerQuota.deleteMany({});
  await prisma.salesChannel.deleteMany({});

  const deletedUsers = await prisma.user.deleteMany({ where: { id: { not: admin.id } } });
  console.log(`Utilisateurs supprimés (hors Super Admin) : ${deletedUsers.count}`);

  await prisma.user.update({ where: { id: admin.id }, data: { email: 'admin@eticket.ma' } });
  console.log('Compte Super Admin conservé, email mis à jour : admin@eticket.ma');
}

main()
  .catch((err) => {
    console.error('ERREUR:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
