'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'motion/react'
import { supabase } from '@/lib/supabase/client'
import { FloatingHearts } from '@/components/3d/FloatingHearts'
import { Sparkles } from 'lucide-react'

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
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authError) {
      const msg = authError.message.includes('Invalid login credentials')
        ? 'Email ou mot de passe incorrect'
        : authError.message.includes('Email not confirmed')
          ? 'Email non confirmé'
          : 'Erreur de connexion'
      setError(msg)
      return
    }
    router.push('/discover')
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-transparent relative">
      <FloatingHearts />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="glass rounded-3xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D92D4A] to-[#A8102A] flex items-center justify-center shadow-[0_0_16px_rgba(217,45,74,0.25)]">
                <Sparkles size={18} className="text-white" />
              </div>
              <span className="text-xl font-bold text-[#F5F0EB]" style={{ fontFamily: 'var(--font-playfair)' }}>Erosia</span>
            </div>
            <h2 className="text-2xl font-bold text-[#F5F0EB]">Heureuse de te revoir</h2>
            <p className="text-sm text-[#A09890]">Connecte-toi pour retrouver tes matchs</p>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-[#F87171] text-center bg-[rgba(248,113,113,0.1)] rounded-xl py-2.5 px-4 border border-[rgba(248,113,113,0.15)]"
            >
              {error}
            </motion.p>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-medium text-[#A09890] block">Email</label>
              <input id="login-email" value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="ton@email.com" autoComplete="email"
                className="w-full bg-[#18181A] text-[#F5F0EB] border border-[#2C2A28] rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-[#D92D4A] focus:shadow-[0_0_0_3px_rgba(217,45,74,0.12)]" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-medium text-[#A09890] block">Mot de passe</label>
              <input id="login-password" value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" autoComplete="current-password"
                className="w-full bg-[#18181A] text-[#F5F0EB] border border-[#2C2A28] rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-[#D92D4A] focus:shadow-[0_0_0_3px_rgba(217,45,74,0.12)]" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-full text-white font-semibold text-sm disabled:opacity-40 transition-all duration-300 active:scale-[0.97] bg-[#D92D4A] shadow-[0_4px_16px_rgba(217,45,74,0.25)] hover:shadow-[0_6px_24px_rgba(217,45,74,0.4)]">
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="space-y-3 text-center">
            <Link href="/forgot-password" className="block text-sm text-[#A09890] hover:text-[#F5F0EB] transition-colors duration-200">
              Mot de passe oublié ?
            </Link>
            <div className="divider-gradient" />
            <Link href="/register" className="block text-sm text-[#D92D4A] font-medium hover:text-[#FF3B5C] transition-colors duration-200">
              Créer un compte
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
