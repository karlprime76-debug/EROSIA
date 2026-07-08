<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:erosia-summary -->
# Erosia — dating app (Next.js 16 + Supabase)

## Conventions
- RSC par défaut, "use client" si interactivité
- glass-card → alias .glass dans globals.css
- #D92D4A primaire, #6B6258/#9E9488 secondaire
- Icônes lucide-react
- p-2.5 min pour boutons icône (44px Apple HIG)
- BottomSheets : Escape + backdrop + swipe + focus trap
- Toutes les fonctions api.ts retournent { data, error } ou { error: string }
- `src/proxy.ts` (anciennement middleware.ts) : auth, rate limiting, CSRF

## Services
- **Supabase** : auth, DB, storage, realtime, presence
- **PayDunya** : paiements Mobile Money / carte (sandbox via PAYDUNYA_MODE=test)
- **Didit** : vérification d'identité
- **Web Push** : notifications push via VAPID

## Architecture fichiers
- `src/lib/api.ts` — fonctions API (à splitter par domaine); contient `getCurrentUserId()` qui utilise `supabase().auth.getUser()`
- `src/lib/supabase/` — clients (browser, server, admin)
- `src/lib/sanitize.ts` — assainissement texte
- `src/lib/paydunya.ts` — création de factures
- `src/lib/paydunya-disburse.ts` — paiements sortants
- `src/lib/didit.ts` — vérification identité Didit
- `src/lib/engine/` — moteur de recommandation (compatibilité, spark score)
- `src/lib/privacy.ts` — types, helpers, API wrapper pour privacy settings
- `src/app/api/privacy/` — API REST GET/PUT privacy settings
- `src/app/api/auth/register/route.ts` — inscription via GoTrue + création profil
- `src/app/api/profile/me/route.ts` — use SSR client auth
- `src/proxy.ts` — middleware: auth + rate limiting via Upstash Redis (Vercel KV)
- `src/app/(auth)/login/page.tsx` — signInWithPassword
- `src/app/(auth)/register/page.tsx` — POST /api/auth/register
- `src/app/(auth)/forgot-password/page.tsx` — appelle `resetPassword()` de api.ts
- `src/app/(auth)/reset-password/page.tsx` — `updateUser({ password })` via GoTrue
- `src/app/(main)/chat/[id]/` — page de chat + error boundary
- `supabase/migration_v19_create_auth_user.sql` — fix NULLs + `verify_password()` + RPCs
- `supabase/migration_v20_auth_config.sql` — supprimé (inapplicable)

## Déploiement Vercel
Variables d'environnement à définir dans Vercel (cf .env.example) :
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_PRIMARY_COLOR`
- `KV_URL`, `KV_REST_API_TOKEN` (rate limiting, ignorer si Vercel KV non activé)
- `NEXT_PUBLIC_VAPID_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUSH_API_KEY`
- `PAYDUNYA_MASTER_KEY`, `PAYDUNYA_PRIVATE_KEY`, `PAYDUNYA_TOKEN`, `PAYDUNYA_MODE`
- `DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID`, `DIDIT_WEBHOOK_SECRET`

Le service email intégré Supabase (Resend) est actif par défaut sur free plan — templates en anglais uniquement. Pour les personnaliser en français, passer au plan Pro ou configurer un SMTP custom.

## URLs
- **Production** : https://erosia-app.vercel.app
- **Supabase Studio** : https://supabase.com/dashboard/project/vxycbjwmovfzywyvrjql
<!-- END:erosia-summary -->
