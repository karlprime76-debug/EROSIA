<!-- BEGIN:erosia-audit-register -->
# Audit inscription (Jul 2026)

## Problème : POST /api/auth/register → 400 silencieux
- **Cause racine** : L'API Supabase Auth renvoie systématiquement 500 avec `"Database error saving new user"` — infrastructure Supabase en panne (compute capacity degraded dans toutes les régions, voir [status.supabase.com](https://status.supabase.com))
- Ce n'est PAS un bug applicatif : le code Zod, route handler, et profile creation sont corrects
- `supabase.auth.signUp()` et `admin.auth.admin.createUser()` échouent tous les deux — l'auth schema de Supabase ne peut pas écrire en base
- En attendant la résolution par Supabase, le route affiche désormais `"Le service d'inscription est temporairement indisponible, réessaie plus tard"` et loggue via `logger.error` (visible en prod Vercel)

## Modifications apportées
- `src/app/api/auth/register/route.ts` :
  - `logger.warn` → `logger.error` pour que les échecs signup apparaissent dans les logs Vercel
  - Message utilisateur en français si l'erreur contient "Database error saving new user"
<!-- END:erosia-audit-register -->

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
- `src/lib/api.ts` — fonctions API (à splitter par domaine)
- `src/lib/supabase/` — clients (browser, server, admin)
- `src/lib/sanitize.ts` — assainissement texte
- `src/lib/paydunya.ts` — création de factures
- `src/lib/paydunya-disburse.ts` — paiements sortants
- `src/lib/didit.ts` — vérification identité Didit
- `src/lib/engine/` — moteur de recommandation (compatibilité, spark score)
- `src/lib/privacy.ts` — types, helpers, API wrapper pour privacy settings
- `src/app/api/privacy/` — API REST GET/PUT privacy settings
- `src/app/api/` — autres routes API REST
- `src/app/(main)/settings/privacy/` — UI paramètres confidentialité
- `src/app/(main)/chat/[id]/` — page de chat + error boundary
- `supabase/migration_v16_privacy_mode.sql` — migration DB privacy
## URLs
- **Production** : https://erosia-app.vercel.app
- **Supabase Studio** : https://supabase.com/dashboard/project/vxycbjwmovfzywyvrjql
<!-- END:erosia-summary -->
