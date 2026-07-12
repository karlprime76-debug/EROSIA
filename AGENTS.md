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
- Toutes les fonctions api retournent { data, error } ou { error: string }
- `src/proxy.ts` (anciennement middleware.ts) : auth, rate limiting, CSRF
- LoadingSpinner : export { LoadingSpinner as default } from '@/components/LoadingSpinner'
- RouteError : pattern dans `src/app/onboarding/error.tsx` (copier-coller pour nouvelles routes)

## Services
- **Supabase** : auth, DB, storage, realtime, presence
- **PayDunya** : paiements Mobile Money / carte (sandbox via PAYDUNYA_MODE=test)
- **Didit** : vérification d'identité
- **Web Push** : notifications push via VAPID

## Architecture fichiers
- `src/lib/api/index.ts` — barrel API (+ types.ts, auth.ts, ...en cours de split)
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

## Audit 14 phases — Session 2026-07-12

### Build & Tests
- `npx next build` : ✅ passe (0 erreurs TS)
- `npm run test` : ✅ 185 tests, 13 fichiers, 0 échecs
- `npx eslint --fix src/` : ✅ 0 erreurs, 1 warning (React Compiler)

### Phase 1 🔴 — Sécurité (session précédente, tout fixé)
proxy.ts, login/route.ts, delete-account/route.ts, auth/callback/route.ts, ThemeProvider, reset-password/route.ts, validations.ts, next.config.ts

### Phase 2 🟡 — Qualité (session précédente, tout fixé)
formatMessageTime, MainLayout, onboarding error.tsx, StoryReader, CSP cleanup

### Phase 3 🟢 — UI (tout fixé cette session)
- 16 loading.tsx ajoutés (toutes les routes manquantes)
- 5 error.tsx ajoutés (routes root-level : privacy, offline, delete-data, cgu, admin)
- 24 boutons p-1/p-1.5 → p-2.5 (conformité Apple HIG 44px)
- ARIA roles dialog+modal ajoutés (EventForm, MessageBubble lightbox)

### Phase 4 — Base de données (fixé dans supabase/)
- `v45_seed_achievements.sql` : ✅ seeding achievements
- `v46_audit_remaining.sql` : ✅ RLS achievements, search_path functions, notifications.type, blocked_users deprecation, index
- `supabase_verify.sql` : script de vérification (colle dans Supabase Studio)

### Phase 5 — Supabase ✅ RLS policies vérifiées, auth flow OK

### Phase 6 — Performance (audité, pas de régression)
- three.js 700KB (déjà en dynamic import)
- Provider tree : Theme > Onboarding > Toast > ContentShell

### Phase 7 — Sécurité (renforcé cette session)
- CSP proxy.ts : `https: http:` supprimé → URLs spécifiques
- Layout.tsx : metadataBase + OG/Twitter tags + robots
- sitemap.xml + robots.txt ajoutés
- Passwords validation : majuscule + chiffre requis

### Phase 8+9 — Mobile + Accessibilité (corrigé cette session)
- 24 boutons undersized fixés
- ARIA roles dialog/modal sur EventForm + MessageBubble
- Scroll lock body : 🔴 reste 9 modaux à corriger (prochaine session)

### Phase 10 — SEO (tout fixé cette session)
- metadataBase + OG/Twitter tags dans le layout racine
- sitemap.xml (8 routes statiques)
- robots.txt (disallow /api/, /admin/, /chat/, etc.)

### Phase 11 — Code quality (corrigé cette session)
- `api.ts` : split en barrel `api/index.ts` + `api/types.ts` + `api/auth.ts`
- `form.tsx` : dead file supprimé
- `sanitize.test.ts` : test corrigé (HTML tags → texte conservé)
- `validations.ts` : password regex uppercase+digit ajouté
- 2 catch {} vides : fixés (admin JSON.parse, haptic feature detect)

### Phase 12 — Tests (créé cette session)
- `auth.test.ts` : 5 tests (getCurrentUserId, signOut, resetPassword)
- `types.test.ts` : 5 tests (Profile, Swipe, Match, Message, ProfileFilters)
- 4 tests existants réparés (api, sanitize, validation)
- Total : 185 tests, 13 fichiers, 0 échecs

### Phase 13 — DB Corrections ✅
Migration `v46_audit_remaining.sql` appliquée (2026-07-12) :
- ✅ RLS achievements + policy select all
- ✅ blocked_users_view basée sur blocks
- ✅ notification_type aligné (match, like, super_like)
- ✅ search_path explicite sur propose_date, process_payout
- ✅ index notifications.user_id + created_at DESC

### Phase 14 — Premium Features ✅
Migration `v47_premium_features.sql` appliquée (2026-07-12).

### Phase 15 — Audit sous-pages (vérifié le 2026-07-12)
- 7 sous-pages auditées, 8 bugs corrigés
- `chat/[id]` : `URL.createObjectURL` → `useMemo` ; `handleEdit` no-op fixé
- `settings` : `prompt()` password → modal sécurisée
- `profile` : redirect `/gifts` → `/island`
- `stories` : filtre `groups[0]` renforcé
- `discover` : `swipeTimeoutsRef` + cleanup
- `gifts/checkout` : `cancelled` flag anti-ops après démontage
- `dates` : code mort retiré
- Build ✅ 115 routes, 185/185 tests ✅

### Prochaine session conseillée
- Scroll lock body : 9 modaux à corriger (problème connu Phase 8)
- Déploiement Vercel : vérifier que les nouvelles variables d'env sont définies

## URLs
- **Production** : https://erosia-app.vercel.app
- **Supabase Studio** : https://supabase.com/dashboard/project/vxycbjwmovfzywyvrjql
<!-- END:erosia-summary -->
