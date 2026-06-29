'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { supabase } from '@/lib/supabase/client'
import { Eye, EyeOff, Sparkles, ArrowRight, Mail, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
            ? 'Email non confirmé — vérifie ta boîte mail'
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
    <div className="flex flex-col items-center justify-center flex-1 px-5 safe-pb safe-pt relative">
      {/* Lueurs de fond */}
      <div className="pointer-events-none absolute top-1/4 left-1/3 w-80 h-80 rounded-full bg-[var(--primary)] blur-[160px] opacity-[0.07]" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-[var(--accent-cool)] blur-[140px] opacity-[0.05]" />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Card principale glassmorphism */}
        <div className="relative overflow-hidden rounded-3xl border border-white/6 shadow-[0_32px_80px_rgba(0,0,0,0.5),_inset_0_1px_0_rgba(255,255,255,0.04)]"
          style={{ background: 'linear-gradient(145deg, rgba(24,24,26,0.92), rgba(15,15,17,0.96))' }}
        >
          {/* Lueur intérieure de la carte */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-[var(--primary)] blur-3xl opacity-[0.08] pointer-events-none" />

          <div className="relative z-10 p-7 sm:p-8 space-y-6">
            {/* Logo & Titre */}
            <div className="text-center space-y-2">
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                className="flex items-center justify-center gap-2.5 mb-5"
              >
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center shadow-[0_8px_24px_rgba(217,45,74,0.25)] border border-white/10">
                  <Sparkles size={20} className="text-white" />
                </div>
                <span className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Erosia</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-xl font-bold text-white tracking-tight"
              >
                Heureux de te revoir 👋
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-[var(--text-secondary)]"
              >
                Connecte-toi pour retrouver tes connexions
              </motion.p>
            </div>

            {/* Alerte erreur */}
            <AnimatePresence>
              {error && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm text-[var(--error)] bg-[var(--error-bg)] rounded-2xl py-3 px-4 border border-[rgba(248,113,113,0.15)] text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Formulaire */}
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="text-xs font-semibold text-[var(--text-secondary)] block tracking-wider uppercase">
                  Email
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors duration-200">
                    <Mail size={16} />
                  </div>
                  <input
                    id="login-email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    type="email"
                    placeholder="ton@email.com"
                    autoComplete="email"
                    className="w-full bg-white/3 text-white border border-white/6 rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none transition-all duration-200 focus:border-[var(--primary)] focus:bg-white/5 focus:shadow-[0_0_0_3px_rgba(217,45,74,0.1)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="text-xs font-semibold text-[var(--text-secondary)] block tracking-wider uppercase">
                    Mot de passe
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors duration-200 tracking-wide uppercase"
                  >
                    Oublié ?
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors duration-200">
                    <Lock size={16} />
                  </div>
                  <input
                    id="login-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full bg-white/3 text-white border border-white/6 rounded-xl pl-10 pr-12 py-3.5 text-sm outline-none transition-all duration-200 focus:border-[var(--primary)] focus:bg-white/5 focus:shadow-[0_0_0_3px_rgba(217,45,74,0.1)] placeholder:text-[var(--text-muted)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white transition-colors duration-200 p-1"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Bouton CTA */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="premium"
                  size="pill-lg"
                  loading={loading}
                  className="w-full text-sm font-semibold tracking-wide"
                  id="login-submit"
                >
                  {loading ? 'Connexion…' : 'Se connecter'}
                  {!loading && <ArrowRight size={18} />}
                </Button>
              </div>
            </form>

            {/* Séparateur & lien inscription */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-xs text-[var(--text-muted)] font-medium tracking-wider uppercase">ou</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <Link
              href="/register"
              className="flex items-center justify-center gap-1.5 text-sm font-semibold text-[var(--text-secondary)] hover:text-white transition-colors duration-200 group"
            >
              Pas encore de compte ?
              <span className="text-[var(--primary)] group-hover:text-[var(--primary-light)] transition-colors duration-200">Créer un compte</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
