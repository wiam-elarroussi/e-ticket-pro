# @eticketpro/sdk

SDK TypeScript pour l'intégration tierce avec l'écosystème E-Ticket Pro (catalogue, réservation, paiement, abonnements, cashless). Répond à l'exigence "Fourniture d'API et SDK" de l'attestation de conformité FIFA (Appel d'Offres N° 02/2026/GSC, §1) — interfaçage avec des plateformes de billetterie tierces (Ticketmaster, FIFA Ticketing).

Chaque service E-Ticket Pro expose en plus sa propre documentation OpenAPI interactive sur `/api-docs` (auth:3001, events:3002, venue:3003, pos:3004, tickets:3005), générée directement depuis le code (`@nestjs/swagger`) — donc toujours synchronisée avec l'implémentation réelle.

## Installation

```bash
npm install
npm run build
```

## Usage

```ts
import { EticketProClient } from '@eticketpro/sdk';

const client = new EticketProClient({
  authBaseUrl: 'https://auth.eticketpro.example.com',
  eventsBaseUrl: 'https://events.eticketpro.example.com',
  venueBaseUrl: 'https://venue.eticketpro.example.com',
  posBaseUrl: 'https://pos.eticketpro.example.com',
});

const { accessToken } = await client.login('client@example.com', 'motdepasse');
const events = await client.listPublishedEvents();
const hold = await client.holdSeat(seatId, accessToken);
const order = await client.checkout({ eventId, venueId, templateId, items: [...] }, accessToken);
```

## Vérification

`verify.js` exécute un scénario réel bout-en-bout (inscription → connexion → catalogue → portefeuille cashless) contre une instance E-Ticket Pro locale :

```bash
node verify.js
```
