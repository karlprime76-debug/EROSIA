#!/usr/bin/env node

/**
 * Setup Didit Identity Verification
 *
 * Usage:
 *   node scripts/setup-didit.mjs
 *
 * Steps:
 *   1. Register programmatically (or paste existing API key)
 *   2. Create a KYC workflow (OCR + Liveness + Face Match + AML)
 *   3. Register webhook destination
 *   4. Write to .env.local
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync, appendFileSync } from 'fs'
import { createInterface } from 'readline/promises'
import { stdin as input, stdout as output } from 'process'

const rl = createInterface({ input, output })

const DIDIT_AUTH = 'https://apx.didit.me/auth/v2/programmatic'
const DIDIT_API = 'https://verification.didit.me/v3'

async function main() {
  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║   Didit Identity Verification — Setup    ║')
  console.log('╚══════════════════════════════════════════╝\n')

  // ── 1. API Key ──────────────────────────────────────
  let apiKey = process.env.DIDIT_API_KEY ?? ''
  if (!apiKey) {
    const hasAccount = await rl.question('As-tu déjà un compte Didit ? (O/n) ')
    if (hasAccount.toLowerCase() !== 'n') {
      apiKey = await rl.question('Colle ta clé API Didit (sk_...) : ')
    } else {
      console.log('\n→ Création d\'un compte Didit...')
      apiKey = await registerProgrammatically()
    }
  }

  // ── 2. Webhook URL ──────────────────────────────────
  const defaultUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const webhookUrl = await rl.question(
    `\nURL de ton site (pour le webhook Didit) :\n[${defaultUrl}] `,
  ) || `${defaultUrl}/api/verify/webhook`

  // Si l'utilisateur a tapé juste le domaine sans le chemin
  const fullWebhookUrl = webhookUrl.includes('/api/verify/webhook')
    ? webhookUrl
    : `${webhookUrl.replace(/\/+$/, '')}/api/verify/webhook`

  console.log(`Webhook URL : ${fullWebhookUrl}`)

  // ── 3. Workflow ────────────────────────────────────
  console.log('\n→ Création du workflow KYC...')
  const workflowId = await createWorkflow(apiKey)
  console.log(`  ✔ Workflow ID : ${workflowId}`)

  // ── 4. Webhook destination ─────────────────────────
  console.log('\n→ Enregistrement du webhook...')
  const { destinationId, webhookSecret } = await createWebhook(apiKey, webhookUrl)
  console.log(`  ✔ Destination ID : ${destinationId}`)
  console.log(`  ✔ Webhook Secret : ${webhookSecret.slice(0, 20)}...`)

  // ── 5. Write .env.local ────────────────────────────
  console.log('\n→ Écriture dans .env.local...')
  writeEnv({
    DIDIT_API_KEY: apiKey,
    DIDIT_WORKFLOW_ID: workflowId,
    DIDIT_WEBHOOK_SECRET: webhookSecret,
  })
  console.log('  ✔ Fait !\n')

  console.log('╔══════════════════════════════════════════╗')
  console.log('║   Configuration terminée !              ║')
  console.log('╚══════════════════════════════════════════╝')
}

async function registerProgrammatically() {
  const email = await rl.question('Email : ')
  const password = await rl.question('Mot de passe (min 8 car.) : ')

  console.log('\n→ Inscription...')
  const regRes = await fetch(`${DIDIT_AUTH}/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, confirm_password: password }),
  })
  if (!regRes.ok) throw new Error(`Registration failed: ${await regRes.text()}`)

  const code = await rl.question(
    '\n✅ Un code de vérification a été envoyé à ton email.\nColle le code à 6 chiffres : ',
  )

  console.log('\n→ Vérification email...')
  const verifyRes = await fetch(`${DIDIT_AUTH}/verify-email/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })
  if (!verifyRes.ok) throw new Error(`Email verification failed: ${await verifyRes.text()}`)

  const data = await verifyRes.json()
  return data.application.api_key
}

async function createWorkflow(apiKey) {
  let res = await fetch(`${DIDIT_API}/workflows/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      workflow_label: 'Erosia KYC',
      features: [
        { feature: 'OCR' },
        { feature: 'LIVENESS', config: { face_liveness_method: 'PASSIVE' } },
        { feature: 'FACE_MATCH' },
        { feature: 'AML' },
      ],
    }),
  })

  // Si déjà existant, récupère la liste
  if (!res.ok) {
    console.log('  → Workflow可能存在, récupération de la liste...')
    const listRes = await fetch(`${DIDIT_API}/workflows/`, {
      headers: { 'x-api-key': apiKey },
    })
    if (!listRes.ok) throw new Error(`List workflows failed: ${await listRes.text()}`)
    const list = await listRes.json()
    const existing = (Array.isArray(list) ? list : list.results ?? []).find(
      (w) => w.workflow_label === 'Erosia KYC' || w.label === 'Erosia KYC',
    )
    if (existing) {
      console.log('  → Workflow existant trouvé')
      return existing.id ?? existing.workflow_id ?? existing.uuid
    }
    throw new Error(`Workflow creation failed: ${await res.text()}`)
  }

  const data = await res.json()
  return data.id ?? data.workflow_id ?? data.uuid ?? Object.values(data)[0]
}

async function createWebhook(apiKey, url) {
  const res = await fetch(`${DIDIT_API}/webhook/destinations/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      url,
      label: 'Erosia Webhook',
      subscribed_events: ['status.updated', 'data.updated'],
      webhook_version: 'v3',
    }),
  })
  if (!res.ok) throw new Error(`Webhook creation failed: ${await res.text()}`)
  const data = await res.json()
  return { destinationId: data.id, webhookSecret: data.secret_shared_key }
}

function writeEnv(entries) {
  const envPath = '.env.local'
  let existing = ''
  if (existsSync(envPath)) {
    existing = readFileSync(envPath, 'utf-8')
  }

  let output = '\n# ── Didit Identity Verification ──\n'
  for (const [key, value] of Object.entries(entries)) {
    if (!existing.includes(`${key}=`)) {
      output += `${key}=${value}\n`
    }
  }

  if (output.trim().startsWith('#')) {
    appendFileSync(envPath, output)
  }
}

main().catch((err) => {
  console.error('Erreur :', err.message)
  process.exit(1)
}).finally(() => rl.close())
