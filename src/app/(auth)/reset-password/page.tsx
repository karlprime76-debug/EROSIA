'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { supabase } from '@/lib/supabase/client'
import { FloatingHearts } from '@/components/3d/FloatingHearts'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
  }

  if (done) {
    return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center px-5 safe-pb safe-pt bg-[var(--bg)]">
      <FloatingHearts />
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass-premium rounded-3xl p-8 max-w-sm w-full text-center relative z-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#34D399] to-[#10B981] flex items-center justify-center mx-auto mb-5 shadow-[0_0_24px_rgba(52,211,153,0.2)]"
          >
            <Sparkles size={28} className="text-white" />
          </motion.div>
          <h2 className="text-xl font-bold text-[var(--text)] mb-2">Mot de passe mis à jour !</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-6">Tu peux maintenant te connecter avec ton nouveau mot de passe.</p>
          <Link href="/login">
            <Button variant="premium" size="pill-lg" className="w-full">
              Se connecter
            </Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center px-5 safe-pb safe-pt bg-[var(--bg)]">
      <FloatingHearts />
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="glass-premium rounded-3xl p-7 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-light)] to-[var(--primary-dark)] flex items-center justify-center mx-auto mb-4 shadow-[var(--shadow-glow)]"
            >
              <Sparkles size={18} className="text-white" />
            </motion.div>
            <h2 className="text-[clamp(1.25rem,4vw,1.75rem)] font-bold text-[var(--text)] tracking-tight">Nouveau mot de passe</h2>
            <p className="text-sm text-[var(--text-secondary)]">Choisis un mot de passe sécurisé</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="text-xs font-medium text-[var(--text-secondary)] block tracking-wide">Mot de passe</label>
              <input id="new-password" type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} required minLength={6}
                className="w-full bg-[var(--bg-card)] text-[var(--text)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200
                  focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(217,45,74,0.12)]
                  placeholder:text-[var(--text-muted)]" />
            </div>
            {error && <p role="alert" className="text-sm text-[var(--error)] text-center">{error}</p>}
            <Button type="submit" variant="premium" size="pill-lg" loading={loading} className="w-full">
              {loading ? 'Mise à jour…' : 'Enregistrer'}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
