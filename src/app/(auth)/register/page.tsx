'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signUp } from '@/lib/api'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', age: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ageNum = parseInt(form.age, 10)
    if (isNaN(ageNum) || ageNum < 18) { setError('Tu dois avoir au moins 18 ans'); return }
    setLoading(true); setError('')
    const result = await signUp(form.email, form.password, form.name, ageNum)
    if (result.error) { setError(result.error); setLoading(false); return }
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-8 text-center">
        <span className="text-6xl mb-4">📧</span>
        <h2 className="text-2xl font-bold mb-2">Compte créé !</h2>
        <p className="text-zinc-500 mb-8">Vérifie tes emails pour confirmer ton inscription.</p>
        <a href="/login" className="py-3.5 px-8 rounded-full text-white font-semibold" style={{ background: '#FF3B5C' }}>
          Se connecter
        </a>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white px-8 justify-center max-w-sm mx-auto w-full">
      <h2 className="text-2xl font-bold mb-1">Crée ton compte</h2>
      <p className="text-zinc-500 mb-8">Rejoins la communauté Erosia</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Prénom</label>
            <input type="text" placeholder="Alex" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-base outline-none focus:border-rose-400" />
          </div>
          <div className="w-20">
            <label className="text-sm font-medium mb-1 block">Âge</label>
            <input type="number" placeholder="25" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} required min="18"
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-base outline-none focus:border-rose-400" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Email</label>
          <input type="email" placeholder="ton@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-base outline-none focus:border-rose-400" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Mot de passe</label>
          <input type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-base outline-none focus:border-rose-400" />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-3.5 rounded-full text-white font-semibold disabled:opacity-50"
          style={{ background: '#FF3B5C' }}>
          {loading ? 'Inscription...' : 'Créer mon compte'}
        </button>
      </form>

      <p className="text-center text-zinc-500 mt-8 text-sm">
        Déjà un compte ?{' '}
        <a href="/login" className="font-semibold" style={{ color: '#FF3B5C' }}>Se connecter</a>
      </p>
    </div>
  )
}
