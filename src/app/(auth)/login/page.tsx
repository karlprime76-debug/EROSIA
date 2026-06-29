'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'motion/react'
import { supabase } from '@/lib/supabase/client'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Email requis'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Email invalide'); return }
    if (!password) { setError('Mot de passe requis'); return }
    if (password.length < 8) { setError('8 caractères minimum'); return }
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        const msg = authError.message.includes('Invalid login credentials')
          ? 'Email ou mot de passe incorrect'
          : authError.message.includes('Email not confirmed')
            ? 'Email non confirmé'
            : 'Erreur de connexion'
        setError(msg)
        return
      }
      router.push('/')
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-5 safe-pb safe-pt">
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="glass-premium rounded-3xl p-7 sm:p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.15 }}
              className="flex items-center justify-center gap-2 mb-4"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-light)] to-[var(--primary-dark)] flex items-center justify-center shadow-[var(--shadow-glow)]">
                <Sparkles size={18} className="text-white" />
              </div>
              <span className="text-xl font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-display)' }}>Erosia</span>
            </motion.div>
            <h2 className="text-[clamp(1.25rem,4vw,1.75rem)] font-bold text-[var(--text)] tracking-tight">
              Heureuse de te revoir
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">Connecte-toi pour retrouver tes matchs</p>
          </div>

          {/* Error */}
          {error && (
            <motion.p
              role="alert"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-[var(--error)] text-center bg-[var(--error-bg)] rounded-xl py-2.5 px-4 border border-[rgba(248,113,113,0.15)]"
            >
              {error}
            </motion.p>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-medium text-[var(--text-secondary)] block tracking-wide">Email</label>
              <input
                id="login-email" value={email} onChange={e => setEmail(e.target.value)}
                type="email" placeholder="ton@email.com" autoComplete="email"
                className="w-full bg-[var(--bg-card)] text-[var(--text)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200
                  focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(217,45,74,0.12)]
                  placeholder:text-[var(--text-muted)]"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-medium text-[var(--text-secondary)] block tracking-wide">Mot de passe</label>
              <input
                id="login-password" value={password} onChange={e => setPassword(e.target.value)}
                type="password" placeholder="••••••••" autoComplete="current-password"
                className="w-full bg-[var(--bg-card)] text-[var(--text)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200
                  focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(217,45,74,0.12)]
                  placeholder:text-[var(--text-muted)]"
              />
            </div>
            <Button type="submit" variant="premium" size="pill-lg" loading={loading} className="w-full">
              {loading ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>

          {/* Links */}
          <div className="space-y-3 text-center">
            <Link href="/forgot-password" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors duration-200">
              Mot de passe oublié ?
            </Link>
            <div className="divider-gradient" />
            <Link href="/register" className="block text-sm text-[var(--primary)] font-medium hover:text-[var(--primary-light)] transition-colors duration-200">
              Créer un compte
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
