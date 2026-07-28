# E-Ticket Pro

Plateforme de billetterie et de contrôle d'accès pour stade — gestion des utilisateurs et rôles, des enceintes et plans 2D, des événements et abonnements, de l'émission de billets sécurisés, de la vente au guichet, et du contrôle d'accès aux portes.

## Architecture

Microservices NestJS (un par module), chacun avec sa propre base PostgreSQL, plus un frontend Next.js unique. Redis est partagé entre les services (uniquement pour la révocation de sessions). L'authentification utilise des JWT RS256 : une paire de clés générée par `auth-service` et distribuée (clé publique) aux autres services pour une vérification hors-ligne, sans appel réseau à chaque requête.

| Service | Module | Port | Base de données |
|---|---|---|---|
| `frontend` | Interface web (Next.js 14) | 3000 | — |
| `auth-service` | 1 — Authentification & rôles/permissions | 3001 | `eticketpro_auth` |
| `venue-service` | 2 — Enceintes, plan 2D (tribunes/zones/rangs/sièges), portes | 3003 | `eticketpro_venue` |
| `events-service` | 3 — Événements, catégories, tarifs, abonnements, jauges | 3004 | `eticketpro_events` |
| `tickets-service` | 4 — Gabarits de billets, génération, codes sécurisés (QR/code-barres) | 3005 | `eticketpro_tickets` |
| `pos-service` | 5 — Vente guichet (encaissement rapide) | 3006 | `eticketpro_pos` |
| `access-service` | 6 — Contrôle d'accès (scan billet/abonnement aux portes) | 3007 | `eticketpro_access` |

Chaque service backend appelle les autres directement en HTTP (`ServicesClient`), en transmettant le token JWT de l'opérateur — pas de compte technique séparé.

## Prérequis

- Node.js 20+
- PostgreSQL 14+ (une base par service, voir tableau ci-dessus)
- Redis

## Démarrage

Pour chaque service backend (`backend/<service>/`) :

```bash
npm install
cp .env.example .env   # renseigner DATABASE_URL, JWT_*, etc.
npx prisma migrate deploy
npm run start:dev
```

`auth-service` nécessite en plus une paire de clés RS256 (voir `backend/auth-service/scripts/generate-keys.sh` et les commentaires dans son `.env.example`) et un premier seed :

```bash
npm run prisma:seed   # crée le compte admin (voir la sortie console pour les identifiants)
```

Pour le frontend :

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

L'application est alors accessible sur `http://localhost:3000`.

## Modules fonctionnels

1. **Authentification & sécurité** — comptes, rôles, permissions granulaires par module, sessions, JWT RS256.
2. **Enceintes** — hiérarchie Enceinte → Tribune → Zone → Rang → Siège, éditeur de plan 2D (polygones de zones, positionnement des sièges), portes et association porte↔zone.
3. **Événements & abonnements** — calendrier, catégories de billets, grilles tarifaires, formules d'abonnement (avec accès global ou calendrier restreint), jauges de vente.
4. **Billets** — éditeur de gabarits (glisser-déposer, liaisons de données), génération de billets avec code sécurisé anti-fraude (checksum propriétaire) et QR/code-barres, réimpression tracée, liste noire.
5. **Vente guichet (POS)** — vente rapide via le plan 2D, résolution tarifaire, encaissement, historique des ventes, canaux de vente (internes ou partenaires).
6. **Contrôle d'accès** — scan de billet ou d'abonnement (saisie manuelle ou caméra), validation en temps réel, export hors-ligne liste blanche/noire pour les postes de contrôle.
