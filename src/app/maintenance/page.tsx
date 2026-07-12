'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { Wrench, Clock } from 'lucide-react'

export default function MaintenancePage() {
  const router = useRouter()
  const [message, setMessage] = useState('Erosia est actuellement en maintenance. Reviens dans quelques instants !')
  const [estimatedDuration, setEstimatedDuration] = useState<string | null>(null)

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/maintenance/check')
        if (res.ok) {
          const data = await res.json()
          if (!data.maintenance) { router.replace('/'); return }
          if (data.message) setMessage(data.message)
          if (data.estimated_duration) setEstimatedDuration(data.estimated_duration)
        }
      } catch {}
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [router])

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-theme text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-card rounded-3xl p-8 max-w-sm w-full"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 15%, transparent), color-mix(in srgb, var(--primary) 5%, transparent))', border: '1px solid color-mix(in srgb, var(--primary) 15%, transparent)' }}
        >
          <Wrench size={36} style={{ color: 'var(--primary)' }} />
        </motion.div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--textPrimary)' }}>Maintenance en cours</h1>
        <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--textSecondary)' }}>{message}</p>
        {estimatedDuration && (
          <div className="flex items-center justify-center gap-2 text-xs" style={{ color: 'var(--textSecondary)' }}>
            <Clock size={14} />
            <span>Durée estimée : {estimatedDuration}</span>
          </div>
        )}
        <p className="text-xs mt-6" style={{ color: 'var(--textMuted)' }}>La page se recharge automatiquement.</p>
      </motion.div>
    </div>
  )
}
