import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'down'
  latency_ms: number
}

export async function GET() {
  const checks: Record<string, HealthCheck> = {
    api: { status: 'healthy', latency_ms: 0 },
    database: { status: 'healthy', latency_ms: 0 },
    auth: { status: 'healthy', latency_ms: 0 },
    storage: { status: 'healthy', latency_ms: 0 },
  }

  const dbStart = Date.now()
  try {
    const admin = createAdminClient()
    await admin.from('profiles').select('id', { count: 'exact', head: true }).limit(1)
    checks.database = { status: 'healthy', latency_ms: Date.now() - dbStart }
  } catch {
    checks.database = { status: 'down', latency_ms: Date.now() - dbStart }
  }

  const authStart = Date.now()
  try {
    const supabase = await createClient()
    await supabase.auth.getUser()
    checks.auth = { status: 'healthy', latency_ms: Date.now() - authStart }
  } catch {
    checks.auth = { status: 'down', latency_ms: Date.now() - authStart }
  }

  const storageStart = Date.now()
  try {
    const admin = createAdminClient()
    await admin.storage.listBuckets()
    checks.storage = { status: 'healthy', latency_ms: Date.now() - storageStart }
  } catch {
    checks.storage = { status: 'down', latency_ms: Date.now() - storageStart }
  }

  const apiStart = Date.now()
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/health`, {
      signal: AbortSignal.timeout(5000),
    })
    checks.api = { status: res.ok ? 'healthy' : 'degraded', latency_ms: Date.now() - apiStart }
  } catch {
    checks.api = { status: 'degraded', latency_ms: Date.now() - apiStart }
  }

  const overallStatus = Object.values(checks).every(c => c.status === 'healthy')
    ? 'healthy'
    : Object.values(checks).some(c => c.status === 'down')
      ? 'degraded'
      : 'degraded'

  try {
    const admin = createAdminClient()
    for (const [service, check] of Object.entries(checks)) {
      await admin.from('system_health').insert({
        service,
        status: check.status,
        latency_ms: check.latency_ms,
      })
    }
  } catch {
  }

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: checks,
  })
}
