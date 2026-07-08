#!/usr/bin/env bash
# Configure Supabase Auth (GoTrue) via Management API
# Utilisation : SUPABASE_PAT=votre_pat ./scripts/configure-auth.sh
# Le PAT se génère ici : https://supabase.com/dashboard/account/tokens
#
# Documenté sur https://supabase.com/docs/reference/api/auth-config

set -euo pipefail

PROJECT_REF="vxycbjwmovfzywyvrjql"
PAT="${SUPABASE_PAT:?SUPABASE_PAT manquant — génère un token sur https://supabase.com/dashboard/account/tokens}"

curl -sS -X PATCH "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${PAT}" \
  -H "Content-Type: application/json" \
  -d '{
    "site_url": "https://erosia-app.vercel.app",
    "uri_allow_list": [
      "https://erosia-app.vercel.app/auth/callback",
      "https://erosia-app.vercel.app/reset-password"
    ],
    "mailer_autoconfirm": true,
    "security_recovery_token_expires_in": 3600
  }' | jq .
