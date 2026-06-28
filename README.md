# Erosia — Dating App

Application de rencontres construite avec **Next.js 16**, **Supabase**, et **PayDunya**.

## Stack

- **Frontend** : Next.js 16 (App Router), React 19, Tailwind CSS v4, Three.js
- **Backend** : Supabase (auth, base de données, storage, realtime)
- **Paiements** : PayDunya (Mobile Money, carte bancaire)
- **Vérification identité** : Didit
- **Push notifications** : Web Push API + Service Worker
- **3D** : React Three Fiber, Drei

## Prérequis

- Node.js >= 20
- Compte Supabase
- Compte PayDunya (optionnel)
- Compte Didit (optionnel)

## Installation

```bash
npm install
cp .env.example .env.local
# Remplir les variables d'environnement
npm run dev
```

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon Supabase |
| `SUPABASE_SERVICE_KEY` | Clé service_role (admin uniquement) |
| `PAYDUNYA_MASTER_KEY` | Clé maître PayDunya |
| `PAYDUNYA_PRIVATE_KEY` | Clé privée PayDunya |
| `PAYDUNYA_TOKEN` | Token PayDunya |
| `PAYDUNYA_MODE` | `live` ou `test` |
| `DIDIT_API_KEY` | Clé API Didit |
| `DIDIT_WORKFLOW_ID` | ID workflow Didit |
| `DIDIT_WEBHOOK_SECRET` | Secret webhook Didit |
| `NEXT_PUBLIC_VAPID_KEY` | Clé publique VAPID |
| `VAPID_PRIVATE_KEY` | Clé privée VAPID |
| `VAPID_SUBJECT` | Sujet VAPID (email) |
| `PUSH_API_KEY` | Clé API push |
| `NEXT_PUBLIC_SITE_URL` | URL du site |

## Scripts

- `npm run dev` — Développement
- `npm run build` — Production build
- `npm run start` — Démarrer le serveur
- `npm run lint` — Linting ESLint
- `npm test` — Tests unitaires Vitest

## Base de données

Les migrations SQL se trouvent dans `supabase/`. Exécuter dans l'ordre :

1. `schema.sql`
2. `schema_v3.sql` → `schema_v4.sql` → `schema_v5.sql`
3. `schema_v6_push.sql`
4. `schema_v7_payment_accounts.sql`
5. `migration_*.sql` (par ordre alphabétique)
6. `storage_complete.sql`
7. `migration_audit_fixes.sql` (correctifs d'audit)

## Licence

Projet privé.
