import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const PERMISSIONS: Array<{ code: string; module: string; description: string }> = [
  { code: 'users:create', module: 'AUTH', description: 'Créer un compte utilisateur' },
  { code: 'users:read', module: 'AUTH', description: 'Consulter les comptes utilisateurs' },
  { code: 'users:update', module: 'AUTH', description: 'Modifier un compte utilisateur' },
  { code: 'users:delete', module: 'AUTH', description: 'Supprimer un compte utilisateur' },
  { code: 'roles:manage', module: 'AUTH', description: 'Créer/modifier les rôles et permissions' },
  { code: 'sessions:read', module: 'AUTH', description: 'Consulter les sessions actives de tous les utilisateurs' },
  { code: 'sessions:revoke', module: 'AUTH', description: "Révoquer une session en urgence" },
  { code: 'partners:create', module: 'AUTH', description: 'Créer un partenaire/vendeur externe' },
  { code: 'partners:read', module: 'AUTH', description: 'Consulter les partenaires' },
  { code: 'partners:update', module: 'AUTH', description: 'Modifier, archiver ou restaurer un partenaire' },
  { code: 'partners:delete', module: 'AUTH', description: 'Supprimer définitivement un partenaire archivé' },
  {
    code: 'channels:read',
    module: 'AUTH',
    description: 'Consulter les canaux de vente (distinct de partners:read — nécessaire au guichet pour choisir un canal)',
  },
  { code: 'channels:manage', module: 'AUTH', description: 'Créer/configurer les canaux de vente' },
  { code: 'channels:toggle', module: 'AUTH', description: "Activer/désactiver un canal de vente en urgence" },
  { code: 'quotas:manage', module: 'AUTH', description: 'Créer/modifier les quotas partenaires' },
  { code: 'venues:read', module: 'VENUE', description: "Consulter les enceintes et leur plan" },
  { code: 'venues:create', module: 'VENUE', description: "Créer une enceinte, tribune, zone, rang ou porte" },
  { code: 'venues:update', module: 'VENUE', description: "Modifier la structure, le plan 2D ou la numérotation" },
  { code: 'venues:delete', module: 'VENUE', description: "Supprimer une enceinte, tribune, zone, rang ou siège" },
  {
    code: 'venues:seats:manage',
    module: 'VENUE',
    description: "Changer l'état ponctuel d'un siège (disponible/réservé/vendu/hors-service) sans droit sur la structure",
  },
  { code: 'events:read', module: 'EVENT', description: 'Consulter la programmation des événements' },
  { code: 'events:create', module: 'EVENT', description: 'Créer un événement (match, compétition, spectacle)' },
  {
    code: 'events:update',
    module: 'EVENT',
    description: "Modifier un événement (dates, fenêtre de vente, statut)",
  },
  { code: 'events:delete', module: 'EVENT', description: 'Supprimer un événement' },
  {
    code: 'pricing:read',
    module: 'PRICING',
    description: 'Consulter les catégories de billets et les grilles tarifaires',
  },
  {
    code: 'pricing:create',
    module: 'PRICING',
    description: 'Créer une catégorie de billet ou une règle tarifaire',
  },
  {
    code: 'pricing:update',
    module: 'PRICING',
    description: 'Modifier une catégorie de billet ou une règle tarifaire',
  },
  {
    code: 'pricing:delete',
    module: 'PRICING',
    description: 'Supprimer une catégorie de billet ou une règle tarifaire',
  },
  {
    code: 'subscriptions:read',
    module: 'SUBSCRIPTION',
    description: 'Consulter les formules d’abonnement et les cartes abonnés',
  },
  {
    code: 'subscriptions:create',
    module: 'SUBSCRIPTION',
    description: 'Créer une formule d’abonnement ou émettre une carte abonné',
  },
  {
    code: 'subscriptions:update',
    module: 'SUBSCRIPTION',
    description: 'Modifier une formule d’abonnement ou une carte abonné (statut, calendrier couvert)',
  },
  {
    code: 'subscriptions:delete',
    module: 'SUBSCRIPTION',
    description: 'Supprimer une formule d’abonnement',
  },
  // Préfixe "sales-" pour ne pas entrer en collision avec 'quotas:manage'
  // (module AUTH, quotas partenaires — concept distinct : jauges de vente
  // par événement/tribune/zone/canal, module 3.4).
  { code: 'sales-quotas:read', module: 'QUOTA', description: 'Consulter les jauges de vente' },
  {
    code: 'sales-quotas:manage',
    module: 'QUOTA',
    description: 'Créer/modifier/supprimer une jauge de vente (plafond, portée)',
  },
  {
    code: 'sales-quotas:toggle',
    module: 'QUOTA',
    description: "Bloquer/débloquer instantanément la vente d'une tribune, zone ou catégorie",
  },
  { code: 'templates:read', module: 'TEMPLATE', description: 'Consulter les gabarits de billets' },
  { code: 'templates:create', module: 'TEMPLATE', description: 'Créer un gabarit de billet' },
  { code: 'templates:update', module: 'TEMPLATE', description: 'Modifier un gabarit de billet' },
  { code: 'templates:delete', module: 'TEMPLATE', description: 'Supprimer un gabarit de billet' },
  { code: 'tickets:read', module: 'TICKET', description: 'Consulter les billets générés' },
  {
    code: 'tickets:create',
    module: 'TICKET',
    description: "Générer un billet à partir d'un gabarit (impression initiale)",
  },
  {
    code: 'tickets:reprint',
    module: 'TICKET',
    description: 'Réimprimer un billet perdu ou une invitation (droit distinct de la génération initiale)',
  },
  {
    code: 'tickets:cancel',
    module: 'TICKET',
    description: 'Annuler un billet (liste noire — échouera la validation au scan)',
  },
  { code: 'pos:sell', module: 'POS', description: 'Vendre un billet au guichet' },
  { code: 'orders:read', module: 'POS', description: 'Consulter l’historique des ventes' },
  { code: 'access:scan', module: 'ACCESS', description: "Scanner un billet ou un abonnement à une porte" },
  { code: 'access:override', module: 'ACCESS', description: "Forcer une validation d'accès" },
  { code: 'reports:read', module: 'REPORTING', description: 'Consulter les rapports et statistiques' },
  {
    code: 'reports:export-crm',
    module: 'REPORTING',
    description:
      "Exporter les contacts acheteurs/abonnés (nom/email/téléphone) à des fins marketing — droit distinct de reports:read car il s'agit de données personnelles exploitables commercialement",
  },
];

const ROLES: Array<{ code: string; label: string; permissions: string[] }> = [
  {
    code: 'SUPER_ADMIN',
    label: 'Super Administrateur',
    permissions: PERMISSIONS.map((p) => p.code),
  },
  {
    code: 'SUPERVISEUR',
    label: 'Superviseur Billetterie',
    permissions: [
      'users:read',
      'sessions:read',
      'sessions:revoke',
      'partners:read',
      'channels:read',
      'channels:toggle',
      'venues:read',
      // Accès restreint : uniquement l'état ponctuel des sièges, jamais la
      // structure/le plan (pas de venues:create/update/delete).
      'venues:seats:manage',
      'events:read',
      'pricing:read',
      // Cartes RFID/NFC associées aux abonnés, émission de billets nominatifs
      // exceptionnels ou d'invitations (module 3.3/5.2) — droit d'écriture complet.
      'subscriptions:read',
      'subscriptions:update',
      // Gère et ajuste les jauges de vente par canal (pas seulement le
      // kill-switch d'urgence channels:toggle/sales-quotas:toggle) : c'est
      // son rôle métier de responsable des ventes.
      'sales-quotas:read',
      'sales-quotas:manage',
      'sales-quotas:toggle',
      'templates:read',
      'tickets:read',
      // Émet lui-même des billets nominatifs exceptionnels/invitations (pas
      // seulement réimprimer un billet déjà généré par un caissier).
      'tickets:create',
      'tickets:reprint',
      // Même logique : peut mettre un billet en liste noire (perdu/volé/
      // litige) sans avoir le droit d'en générer de nouveaux.
      'tickets:cancel',
      'orders:read',
      // Supervision du contrôle d'accès : peut scanner ponctuellement et
      // forcer une entrée en cas de litige à la porte.
      'access:scan',
      'access:override',
      'reports:read',
    ],
  },
  {
    code: 'CAISSIER',
    label: 'Caissier',
    permissions: [
      'pos:sell',
      'orders:read',
      'venues:read',
      // La vente marque elle-même le siège comme Vendu au moment de l'encaissement.
      'venues:seats:manage',
      // Nécessaire pour choisir un canal de vente à l'encaissement (module 5).
      'channels:read',
      'events:read',
      'pricing:read',
      'subscriptions:read',
      'sales-quotas:read',
      'templates:read',
      'tickets:read',
      'tickets:create',
    ],
  },
  {
    code: 'CONTROLEUR',
    label: 'Contrôleur',
    permissions: ['access:scan', 'access:override', 'events:read', 'subscriptions:read'],
  },
];

async function main() {
  console.log('Seed : permissions...');
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {},
      create: permission,
    });
  }

  console.log('Seed : rôles système par défaut...');
  // Suppression automatique de tout rôle hors des 4 rôles système officiels
  await prisma.role.deleteMany({
    where: {
      code: { notIn: ['SUPER_ADMIN', 'SUPERVISEUR', 'CAISSIER', 'CONTROLEUR'] },
      isSystem: false,
    },
  });

  for (const role of ROLES) {
    const created = await prisma.role.upsert({
      where: { code: role.code },
      update: { label: role.label },
      create: { code: role.code, label: role.label, isSystem: true },
    });

    for (const permCode of role.permissions) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code: permCode } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: created.id, permissionId: permission.id } },
        update: {},
        create: { roleId: created.id, permissionId: permission.id },
      });
    }
  }

  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { code: 'SUPER_ADMIN' } });
  console.log('Seed : réinitialisation compte Super Administrateur...');
  const passwordHash = await argon2.hash('ChangeMe!2026', { type: argon2.argon2id });
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
      isActive: true,
      roleId: superAdminRole.id,
    },
    create: {
      username: 'admin',
      email: 'admin@eticketpro.local',
      passwordHash,
      fullName: 'Super Administrateur',
      roleId: superAdminRole.id,
      isActive: true,
    },
  });
  console.log('  -> username: admin / password: ChangeMe!2026 (Compte réinitialisé et déverrouillé)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
