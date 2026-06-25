'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [age, setAge] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || name.trim().length > 50) { setError('Nom requis (50 car. max)'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Email invalide'); return }
    if (password.length < 8) { setError('8 caractères minimum'); return }
    const ageNum = parseInt(age)
    if (!ageNum || ageNum < 18 || ageNum > 120) { setError('Âge invalide (18-120)'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '' },
        body: JSON.stringify({ email, password, name: name.trim(), age: ageNum }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur lors de l\'inscription'); setLoading(false); return }
      setSuccess(true)
    } catch {
      setError('Erreur réseau')
      setLoading(false)
    }
  }

  if (success) return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-transparent">
      <div className="glass-card rounded-3xl p-8 max-w-sm w-full text-center">
        <h2 className="text-xl font-bold mb-2">Inscription réussie !</h2>
        <p className="text-[#9E9488] text-sm mb-6">Vérifie ta boîte mail pour confirmer ton compte.</p>
        <Link href="/login" className="inline-block w-full py-3.5 rounded-full text-white font-semibold text-center" style={{ background: '#D92D4A' }}>Se connecter</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-transparent">
      <form onSubmit={handleRegister} className="w-full max-w-sm glass-card rounded-3xl p-8 space-y-4">
        <h2 className="text-2xl font-bold text-center">Inscription</h2>
        {error && <p className="text-sm text-red-500 text-center bg-red-500/10 rounded-lg py-2">{error}</p>}
        <div>
          <label htmlFor="reg-name" className="sr-only">Prénom</label>
          <input id="reg-name" value={name} onChange={e => setName(e.target.value)} placeholder="Prénom" autoComplete="name"
            className="w-full px-4 py-3 rounded-xl border border-[#2A2826] text-sm outline-none focus:border-[#D92D4A] transition-colors" />
        </div>
        <div>
          <label htmlFor="reg-email" className="sr-only">Email</label>
          <input id="reg-email" value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" autoComplete="email"
            className="w-full px-4 py-3 rounded-xl border border-[#2A2826] text-sm outline-none focus:border-[#D92D4A] transition-colors" />
        </div>
        <div>
          <label htmlFor="reg-password" className="sr-only">Mot de passe</label>
          <input id="reg-password" value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Mot de passe (8+ car.)" autoComplete="new-password"
            className="w-full px-4 py-3 rounded-xl border border-[#2A2826] text-sm outline-none focus:border-[#D92D4A] transition-colors" />
        </div>
        <div>
          <label htmlFor="reg-age" className="sr-only">Âge</label>
          <input id="reg-age" value={age} onChange={e => setAge(e.target.value)} type="number" placeholder="Âge" min={18} max={120}
            className="w-full px-4 py-3 rounded-xl border border-[#2A2826] text-sm outline-none focus:border-[#D92D4A] transition-colors" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-3.5 rounded-full text-white font-semibold disabled:opacity-40 transition-all active:scale-95" style={{ background: '#D92D4A' }}>
          {loading ? 'Inscription...' : 'Créer mon compte'}
        </button>
        <Link href="/login" className="block text-center text-sm text-[#9E9488] hover:text-white transition">Déjà un compte ?</Link>
      </form>
    </div>
  )
}
