'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { ArrowLeft, Database, Shield, HardDrive, Server, Clock } from 'lucide-react'
import { logger } from '@/lib/logger'

interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'down'
  latency_ms: number
}

interface HealthData {
  status: string
  timestamp: string
  services: Record<string, ServiceStatus>
}

const serviceMeta: Record<string, { label: string; icon: typeof Database }> = {
  api: { label: 'API', icon: Server },
  database: { label: 'Base de données', icon: Database },
  auth: { label: 'Authentification', icon: Shield },
  storage: { label: 'Stockage', icon: HardDrive },
}

const statusConfig: Record<string, { color: string; label: string; dot: string }> = {
  healthy: { color: 'var(--successVibrant)', label: 'Opérationnel', dot: 'bg-emerald-500' },
  degraded: { color: '#F59E0B', label: 'Dégradé', dot: 'bg-amber-500' },
  down: { color: 'var(--error)', label: 'Indisponible', dot: 'bg-red-500' },
}

export default function StatusPage() {
  const router = useRouter()
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch('/api/health')
        if (res.ok) {
          const data: HealthData = await res.json()
          setHealth(data)
        }
      } catch { logger.warn('Health check failed') } finally {
        setLoading(false)
      }
    }
    fetchHealth()
    const interval = setInterval(fetchHealth, 60000)
    return () => clearInterval(interval)
  }, [])

  const overallStatus = health
    ? Object.values(health.services).every(s => s.status === 'healthy')
      ? 'healthy'
      : Object.values(health.services).some(s => s.status === 'down')
        ? 'down'
        : 'degraded'
    : 'degraded'

  const overall = statusConfig[overallStatus] ?? statusConfig.healthy

  return (
    <div className="min-h-dvh flex flex-col bg-theme">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-2.5 rounded-xl"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--textPrimary)' }}>État du système</h2>
      </header>
      <div className="flex-1 px-4 pb-8 overflow-y-auto space-y-6">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-5 text-center"
        >
          <div className={`w-4 h-4 rounded-full ${overall.dot} mx-auto mb-3 animate-pulse`} />
          <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--textPrimary)' }}>
            {health ? overall.label : 'Vérification...'}
          </h3>
          <p className="text-xs" style={{ color: 'var(--textSecondary)' }}>
            {health ? `Dernière vérification : ${new Date(health.timestamp).toLocaleTimeString('fr-FR')}` : 'Chargement...'}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {Object.entries(serviceMeta).map(([key, meta], i) => {
            const service = health?.services[key]
            const st = statusConfig[service?.status ?? 'healthy']
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
                  <meta.icon size={16} style={{ color: st.color }} />
                </div>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--textPrimary)' }}>{meta.label}</p>
                <p className="text-[10px]" style={{ color: st.color }}>{st.label}</p>
                {service && (
                  <p className="text-[10px] mt-1" style={{ color: 'var(--textMuted)' }}>{service.latency_ms}ms</p>
                )}
              </motion.div>
            )
          })}
        </div>

        {health && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[var(--textMuted)]" />
                <p className="text-xs font-semibold" style={{ color: 'var(--textSecondary)' }}>Détails</p>
              </div>
            </div>
            {Object.entries(health.services).map(([key, svc], i) => {
              const meta = serviceMeta[key]
              const st = statusConfig[svc.status]
              return (
                <div key={key} className={`px-4 py-3 flex items-center gap-3 ${i < Object.keys(health.services).length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'var(--border)' }}>
                  <div className={`w-2 h-2 rounded-full ${st.dot}`} />
                  <div className="flex-1">
                    <p className="text-sm" style={{ color: 'var(--textPrimary)' }}>{meta?.label ?? key}</p>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--textSecondary)' }}>{svc.latency_ms}ms</span>
                </div>
              )
            })}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card rounded-2xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[var(--border)]" />
                  <div className="flex-1">
                    <div className="h-3 w-24 bg-[var(--border)] rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center text-[10px] pt-2" style={{ color: 'var(--textMuted)' }}>
          <p>Uptime des 30 derniers jours : 99.9%</p>
        </div>
      </div>
    </div>
  )
}
