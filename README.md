# E-Ticket Pro

Plateforme de billetterie et de contrôle d'accès pour stade — gestion des utilisateurs et rôles, des enceintes et plans 2D, des événements et abonnements, de l'émission de billets sécurisés, de la vente au guichet, du contrôle d'accès aux portes, des partenaires revendeurs et du reporting temps réel.

> Ce dépôt contient le **back-office** (back-end + interface d'administration). Le portail public destiné aux spectateurs, **E-Ticket-Pay**, est un projet séparé : [wiam-elarroussi/e-ticket-pay](https://github.com/wiam-elarroussi/e-ticket-pay). Les deux applications partagent les mêmes microservices back-end ci-dessous.

## Architecture

Microservices NestJS (un par module), chacun avec sa propre base PostgreSQL, plus un frontend Next.js unique. Redis est partagé entre les services (révocation de sessions). L'authentification utilise des JWT RS256 : une paire de clés générée par `auth-service` et distribuée (clé publique) aux autres services pour une vérification hors-ligne, sans appel réseau à chaque requête.

| Service | Module | Port | Base de données |
|---|---|---|---|
| `frontend` | Interface web d'administration (Next.js 14) | 3006 | — |
| `auth-service` | 1 — Authentification, rôles/permissions, partenaires | 3001 | `eticketpro_auth` |
| `events-service` | 3 — Événements, catégories, tarifs, abonnements, jauges | 3002 | `eticketpro_events` |
| `venue-service` | 2 — Enceintes, plan 2D (tribunes/zones/rangs/sièges), portes | 3003 | `eticketpro_venue` |
| `pos-service` | 5 — Vente guichet (encaissement rapide) | 3004 | `eticketpro_pos` |
| `tickets-service` | 4 — Gabarits de billets, génération, codes sécurisés (QR/code-barres) | 3005 | `eticketpro_tickets` |
| `access-service` | 6 — Contrôle d'accès (scan billet/abonnement aux portes) | 3007 | `eticketpro_access` |
| `reports-service` | 7 — Supervision, BI, exports (agrège les autres services, pas de base propre) | 3008 | — |

Chaque service backend appelle les autres directement en HTTP (`ServicesClient`), en transmettant le token JWT de l'opérateur — pas de compte technique séparé.

## Prérequis

- Node.js 20+
- PostgreSQL 14+ (une base par service, voir tableau ci-dessus)
- Redis
- OpenSSL (pour générer la paire de clés RS256 de `auth-service`)

## Démarrage rapide

### 1. Bases de données

Créer une base PostgreSQL par service (`eticketpro_auth`, `eticketpro_events`, `eticketpro_venue`, `eticketpro_pos`, `eticketpro_tickets`, `eticketpro_access` — `reports-service` n'a pas de base propre). Le plus simple :

```sql
CREATE USER eticketpro WITH PASSWORD 'eticketpro_dev_pwd';
CREATE DATABASE eticketpro_auth OWNER eticketpro;
CREATE DATABASE eticketpro_events OWNER eticketpro;
CREATE DATABASE eticketpro_venue OWNER eticketpro;
CREATE DATABASE eticketpro_pos OWNER eticketpro;
CREATE DATABASE eticketpro_tickets OWNER eticketpro;
CREATE DATABASE eticketpro_access OWNER eticketpro;
```

### 2. `auth-service` en premier (génère les clés utilisées par tous les autres services)

```bash
cd backend/auth-service
npm install
cp .env.example .env
bash scripts/generate-keys.sh          # affiche JWT_PRIVATE_KEY et JWT_PUBLIC_KEY en base64
# copier ces deux valeurs dans .env (JWT_PRIVATE_KEY et JWT_PUBLIC_KEY)
npx prisma migrate deploy
npm run prisma:seed                    # crée le compte admin — les identifiants s'affichent dans la console
npm run start:dev                      # http://localhost:3001
```

### 3. Chaque autre service backend (`events-service`, `venue-service`, `pos-service`, `tickets-service`, `access-service`, `reports-service`)

```bash
cd backend/<service>
npm install
cp .env.example .env
# coller EXACTEMENT la même valeur JWT_PUBLIC_KEY que dans backend/auth-service/.env
npx prisma migrate deploy              # inutile pour reports-service (pas de base propre)
npm run start:dev
```

### 4. Le frontend d'administration

```bash
cd frontend
npm install
cp .env.local.example .env.local       # les ports par défaut correspondent au tableau ci-dessus
npm run dev                            # http://localhost:3006
```

Se connecter avec le compte admin créé par `npm run prisma:seed` à l'étape 2 (identifiants affichés dans la console au moment du seed).

## Modules fonctionnels

1. **Authentification & sécurité** — comptes, rôles, permissions granulaires par module, sessions révocables, JWT RS256.
2. **Enceintes** — hiérarchie Enceinte → Tribune → Zone → Rang → Siège, éditeur de plan 2D (polygones de zones, positionnement des sièges), portes et association porte↔zone.
3. **Événements & abonnements** — calendrier, image d'événement, catégories de billets, grilles tarifaires (par siège/zone/tribune/événement), formules d'abonnement, jauges de vente.
4. **Billets** — éditeur de gabarits (glisser-déposer, liaisons de données), génération de billets avec code sécurisé anti-fraude (checksum propriétaire) et QR/code-barres, réimpression tracée, liste noire.
5. **Vente guichet (POS)** — vente rapide via le plan 2D, résolution tarifaire, encaissement multi-moyens, historique des ventes, mode hors-ligne avec synchronisation automatique.
6. **Contrôle d'accès** — scan de billet ou d'abonnement (saisie manuelle ou caméra), validation en temps réel, mode hors-ligne pour les postes de contrôle.
7. **Supervision & Business Intelligence** — tableau de bord temps réel, comparatifs inter-événements, exports CSV/XLSX/PDF/DOCX/XML.
8. **Partenaires** — agences et revendeurs externes avec clé API dédiée, quotas de vente par canal, portail en lecture seule (consommé par E-Ticket-Pay).
