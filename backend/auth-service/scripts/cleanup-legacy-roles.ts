import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Suppression ponctuelle des rôles ADMIN/OPERATEUR/DIRECTEUR_STADE, consolidés
 * dans SUPER_ADMIN (structure RBAC ramenée à 4 rôles). Script à usage unique —
 * le seed n'efface jamais de rôle (upsert uniquement), donc ce nettoyage ne
 * se répète pas automatiquement.
 */
async function main() {
  const caissier = await prisma.role.findUniqueOrThrow({ where: { code: 'CAISSIER' } });
  const superAdmin = await prisma.role.findUniqueOrThrow({ where: { code: 'SUPER_ADMIN' } });

  // OPERATEUR est redondant avec CAISSIER (rôle métier quasi identique) ; ADMIN
  // et DIRECTEUR_STADE sont fusionnés dans SUPER_ADMIN (doublons administratifs).
  const legacyTargets: Record<string, { id: string; code: string }> = {
    ADMIN: superAdmin,
    OPERATEUR: caissier,
    DIRECTEUR_STADE: superAdmin,
  };

  for (const [code, target] of Object.entries(legacyTargets)) {
    const role = await prisma.role.findUnique({ where: { code }, include: { users: true } });
    if (!role) {
      console.log(`Rôle ${code} déjà absent, rien à faire.`);
      continue;
    }

    if (role.users.length > 0) {
      console.log(`Réaffectation de ${role.users.length} utilisateur(s) de ${code} vers ${target.code}...`);
      for (const user of role.users) {
        await prisma.user.update({ where: { id: user.id }, data: { roleId: target.id } });
        console.log(`  - ${user.username} -> ${target.code}`);
      }
    }

    await prisma.role.delete({ where: { id: role.id } }); // cascade sur role_permissions
    console.log(`Rôle ${code} supprimé.`);
  }
}

main()
  .catch((err) => {
    console.error('ERREUR:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
