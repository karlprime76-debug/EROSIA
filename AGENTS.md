<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:erosia-summary -->
# Erosia — dating app (Next.js 15 + Supabase)

## Session 1 (7 améliorations)
- Tests unitaires Vitest + test fichier api.test.ts
- Assainissement DOMPurify (sanitize util)
- Error boundaries (root, auth, main, chat)
- CI GitHub Actions
- Pagination : getMessagesPaginated, getNotificationsPaginated, getProfilesPaginated + useInfiniteScroll
- PWA : manifest.json, sw.js
- React 19 use() : daily-profile migré

## Session 2 (features + correctifs)
- **Logo** cliquable, icône PWA 192/512
- **"Modifier" caché** pour Déconnexion/Centre d'aide
- **/onboarding → /register**
- **18+ & CGU** checkbox register
- **Stories/Antennes/Boutique** dans bottom nav + menu "Plus"
- **Daily swipe limit** 20/jour gratuit
- **Gifts PayDunya** create-checkout, webhook, 15% fee
- **Mobile Money** pays/opérateur/carte
- **Premium labels** compteur swipe, super like
- **Home page** refonte animations + descriptions
- **Self-messaging bloqué**
- **View-once media** en DM (flouté → révélé au clic)
- **Stories → Premium** redirection
- **Subscription type** strict dans settings

## Session 4 (corrections robustesse)
- **updateProfile** — ajout `.select().maybeSingle()` pour confirmer l'update ; retour `{ data }` / `{ error: message }`
- **saveProfile** — encapsulé dans `try/catch` (profil page)
- **Supabase client** — `{ isSingleton: true }` explicite via `createBrowserClient`
- **api.ts** — `supabase()` ré-exporte directement le singleton `sbClient` de `client.ts`

## Session 3 (10 améliorations)
- **Middleware** — `src/middleware.ts` avec `createServerClient`, protection routes privées, redirect `/login` si non auth
- **Email confirmation** — register API utilise `auth.signUp()` au lieu de `admin.createUser()` (envoi email)
- **OAuth** — boutons Google/Facebook/Apple login + route `/auth/callback` pour échange code
- **Push notifications** — `public/sw.js` (push + notificationclick), API `/api/push/send` (web-push), migration `schema_v6_push.sql` (trigger via pg_net)
- **Online indicator** — Realtime Presence channel dans chat `[id]/page.tsx`
- **Admin dashboard** — page `/admin` : validation vérifications + modération file
- **Undo super like** — `undoSuperLike()` dans api.ts + bouton discover
- **City search** — `searchProfilesByCity()` api.ts + input "Ville" dans filtres discover
- **Tests** — api.test.ts : 4 tests (signOut, createSwipe, sendMessage). Total : 10 tests passants
- **Token refresh** — déjà géré par SSR `updateSession()` dans le middleware via cookies

## Conventions
- RSC par défaut, "use client" si interactivité
- glass-card / glass-light
- #D92D4A primaire, #6B6258/#9E9488 secondaire
- Icônes lucide-react
- p-2.5 min pour boutons icône (44px Apple HIG)
- BottomSheets : Escape + backdrop + swipe + focus trap
<!-- END:erosia-summary -->
