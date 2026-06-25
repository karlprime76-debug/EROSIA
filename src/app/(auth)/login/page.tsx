'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { FloatingHearts } from '@/components/3d/FloatingHearts'

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
      const msg = authError.message.includes('Invalid login credentials') ? 'Email ou mot de passe incorrect' : authError.message.includes('Email not confirmed') ? 'Email non confirmé' : 'Erreur de connexion'
      setError(msg)
      return
    }
    router.push('/discover')
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-transparent relative">
      <FloatingHearts />
      <form onSubmit={handleLogin} className="w-full max-w-sm glass-card rounded-3xl p-8 space-y-4 relative z-10">
        <h2 className="text-2xl font-bold text-center">Connexion</h2>
        {error && <p className="text-sm text-red-500 text-center bg-red-500/10 rounded-lg py-2">{error}</p>}
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" autoComplete="email"
          className="w-full px-4 py-3 rounded-xl border border-[#2A2826] text-sm outline-none focus:border-[#D92D4A] transition-colors" />
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Mot de passe" autoComplete="current-password"
          className="w-full px-4 py-3 rounded-xl border border-[#2A2826] text-sm outline-none focus:border-[#D92D4A] transition-colors" />
        <button type="submit" disabled={loading}
          className="w-full py-3.5 rounded-full text-white font-semibold disabled:opacity-40 transition-all active:scale-95" style={{ background: '#D92D4A' }}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
        <Link href="/forgot-password" className="block text-center text-sm text-[#9E9488] hover:text-white transition">Mot de passe oublié ?</Link>
        <Link href="/register" className="block text-center text-sm text-[#D92D4A] hover:underline">Créer un compte</Link>
      </form>
    </div>
  )
}
