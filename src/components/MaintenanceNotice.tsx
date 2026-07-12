'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { AlertTriangle, X } from 'lucide-react'

export default function MaintenanceNotice() {
  const [show, setShow] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/maintenance/check')
        if (res.ok) {
          const data = await res.json()
          if (data.maintenance) {
            const dismissed = sessionStorage.getItem('maintenance_dismissed')
            if (!dismissed) {
              setMessage(data.message ?? 'Erosia est en maintenance. Certaines fonctionnalités peuvent être indisponibles.')
              setShow(true)
            }
          }
        }
      } catch {}
    }
    check()
    const interval = setInterval(check, 120000)
    return () => clearInterval(interval)
  }, [])

  const dismiss = () => {
    setShow(false)
    sessionStorage.setItem('maintenance_dismissed', '1')
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 px-4 pt-2"
        >
          <div className="glass-card rounded-xl p-3 flex items-center gap-3 border border-amber-500/20"
            style={{ background: 'color-mix(in srgb, #F59E0B 10%, var(--card))' }}>
            <AlertTriangle size={18} className="text-amber-500 shrink-0" />
            <p className="text-xs flex-1" style={{ color: 'var(--textPrimary)' }}>{message}</p>
            <button type="button" onClick={dismiss} aria-label="Fermer" className="p-1.5 shrink-0">
              <X size={14} style={{ color: 'var(--textSecondary)' }} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
