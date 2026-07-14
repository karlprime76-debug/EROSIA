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
- API routes : utiliser `apiResponse(data)`, `apiError(msg, status)` de `src/lib/api-response.ts`
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
- `src/lib/api-response.ts` — helper `apiResponse`/`apiError`/`apiServerError` pour les API routes
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

### Phase 16 — Audit interactif global (2026-07-13)
- **EventForm** (bug signalé) : validation inline (`<AlertCircle>`), sticky footer submit, `body.style.overflow` scroll lock, erreurs claires au lieu de `catch {}` générique
- **12+ boutons async** sécurisés contre le double-tap : admin (10+ handlers), dates (confirm/cancel/choose), discover (block/flirt/report/filters), travel (saving), gifts (savePayment), island (photo set/delete), chat (audio send), StoryReader (archive/delete), EventCard (join/leave)
- **Scroll lock** ajouté à 4 modales réutilisables : MatchModal, ConfirmDialog, ReportSheet, ConsentDialog
- **Admin page** : `adminActionLoading` state + `disabled` sur warn/suspend/ban, modération, vérification, premium grant/revoke, maintenance toggle, payout actions
- Build ✅ 114 routes, 185/185 tests ✅

### Phase 18 — Audit complet + corrections accessibilité (2026-07-13)
- **Build** ✅ 115 routes, 0 TS errors
- **Tests** ✅ 185/185, 13/13 files
- **Lint** ✅ 0 errors, 3 warnings (préexistants : React Compiler, exhaustive-deps, img→Image)
- **Imports inutilisés / code mort** : 0 trouvés
- **`document.createElement('input')`** : 0 (tous en hidden input + ref)
- **`catch {}` vides** : 0 (fixé `MaintenanceNotice.tsx:25` → `logger.error`)
- **Scroll lock (`body.style.overflow`)** : ✅ 9 modaux, tous OK
- **ARIA `role="dialog"` / `aria-modal`** : ✅ StoryReader fixé (+9 déjà OK)
- **Boutons < 44px** : 0 restants (fixé p-1/p-1.5/p-2 → p-2.5 dans admin `page.tsx:668-673`, chat `[id]/page.tsx:638`, `MaintenanceNotice.tsx:50`, `ReportSheet.tsx:79`, onboarding `page.tsx:549`)
- **`aria-label` manquants** : 12 fixés (admin × 9, chat × 1, MessageBubble × 2, StoryCreator × 1, ReportSheet × 1, onboarding × 3)
- **Liens MoreMenu** : 10/10 valides ✅ + "Mode Voyage" et "Premium" retirés

### Phase 17 — Refonte paramètres + nettoyage boutique & navigation (2026-07-13)
- **Boutique** : retiré l'onglet "Abonnements" des pils de navigation (`gifts/page.tsx`)
- **MoreMenu** : retiré les entrées "Mode Voyage" et "Premium" (liens supprimés) ; icônes inutilisées nettoyées
- **Paramètres** : page réécrite — supprimé les sections Abonnement (Premium, createCheckoutSession, polling), Mode voyage (travelCity, handleTravelToggle2), Centre de sécurité, Langue (useLocale, sélecteur fr/en). Gardé : Confidentialité (visibilité, notifications, mode fantôme), Compte (pseudo, suppression). Imports nettoyés (Crown, Shield, Globe, MapPin, Lock, MapPin, startTransition, getSubscriptionStatus, createCheckoutSession, getTravelMode, setTravelMode)
- **Coach IA** : `min-h-screen` → `flex-1`, `pb-24` supprimé (compatible layout main)
- **EventForm** : bouton "Créer" sticky footer — ajout `pb-[calc(0.75rem+env(safe-area-inset-bottom,80px))]` pour éviter débordement derrière nav mobile
- **Rendez-vous** : ajout bouton retour (`ArrowLeft` + `useRouter`) dans l'en-tête
- **Confidentialité/CGU** : pages converties en Server Components (restauration `export const metadata`), liens Retour changés de `/login`/`/register` vers `/settings`

### Phase 20 — Nettoyage monde 3D + API consistance (2026-07-13)
- **Monde 3D supprimé** : `src/components/3d/` 10 fichiers inutilisés (World, ErosiaIsland, ZoneMesh, CameraManager, LightingManager, NPC, TeleporterGlow, InteractionHighlight, Avatar, HUD, barrel), `src/lib/world/` (39 fichiers), `src/lib/social-space.ts`, `src/app/api/world/*` (4 routes), `src/app/api/social/{join,leave,position,spaces/*}` (5 routes). Conservé : SensualBackground, FloatingHearts, MatchBurst, TiltCard.
- **Helper API** : `src/lib/api-response.ts` (apiResponse/apiError/apiServerError)
- **Code mort** : `createNPCchema` retiré de validations.ts
- **sw.js** : fix `c.url === url` → `includes(url)` (trop strict)
- **Build** ✅ 111/111, **Tests** ✅ 108/108 (12 fichiers), **Lint** ✅ 0 errors

## Web Push — Architecture

### Double voie
1. **Trigger DB** (`send_push_on_notification` sur `notifications` BEFORE INSERT) :
   - Vérifie `profiles.notif_push`, `notification_preferences` (push_enabled + per-type + quiet hours)
   - Génère titre/body selon le type (match, message, super_like, like, gift, etc.)
   - Définit `action_url` depuis les métadonnées si absent
   - Appelle `net.http_post` vers `app.settings.push_api_url` (best-effort, fire-and-forget)
   - **Ne set PAS `push_sent_at`** → laisse le worker gérer l'envoi effectif + marquage

2. **Worker Vercel Cron** (`/api/push/worker`, toutes les 1 min via `vercel.json`) :
   - Requiert header `x-api-key` (PUSH_API_KEY)
   - Récupère les notifications WHERE `push_sent_at IS NULL` des dernières 24h
   - Vérifie préférences (redondant avec le trigger, sécurité)
   - Envoie via `web-push` avec VAPID
   - Supprime les souscriptions invalides
   - Marque `push_sent_at = now()` après succès

### Fichiers clés
- `src/app/api/push/send/route.ts` — API protégée par x-api-key, envoie à un userId
- `src/app/api/push/subscribe/route.ts` — inscription STB (auth requise)
- `src/app/api/push/worker/route.ts` — Cron worker, idempotent
- `src/app/push.ts` — subscribeToPush() côté client (SwRegister.tsx)
- `supabase/migration_v51_push_worker.sql` — Trigger fixé + colonne push_sent_at
- `vercel.json` — Configuration du cron */1 * * * *
- `supabase/schema_v6_push.sql`, `migration_v23_fix_push_notification.sql`, `migration_v26_notifications_fixes.sql`, `v48_security_audit_fixes.sql` — Historique

### Configuration Supabase nécessaire
Dans Supabase Studio > SQL Editor, exécuter :
```sql
SELECT set_config('app.settings.push_api_url', 'https://erosia-alpha.vercel.app/api/push/send', false);
SELECT set_config('app.settings.push_api_key', '<PUSH_API_KEY>', false);
```

### Prochaine session conseillée
- API consistance : migrer les routes les plus critiques vers `apiResponse`/`apiError`

## URLs
- **Production** : https://erosia-app.vercel.app
- **Supabase Studio** : https://supabase.com/dashboard/project/vxycbjwmovfzywyvrjql
<!-- END:erosia-summary -->
