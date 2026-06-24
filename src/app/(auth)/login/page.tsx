'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn(email, password)
    if (result.error) { setError(result.error); setLoading(false); return }
    router.push('/discover')
  }

  return (
    <div className="flex-1 flex flex-col bg-white px-8 justify-center max-w-sm mx-auto w-full">
      <h2 className="text-2xl font-bold mb-1">Content de te revoir</h2>
      <p className="text-zinc-500 mb-8">Connecte-toi pour continuer l&rsquo;aventure</p>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Email</label>
          <input type="email" placeholder="ton@email.com" value={email}
            onChange={(e) => setEmail(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-base outline-none focus:border-rose-400" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Mot de passe</label>
          <input type="password" placeholder="••••••••" value={password}
            onChange={(e) => setPassword(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-base outline-none focus:border-rose-400" />
          <a href="/forgot-password" className="text-xs text-zinc-400 mt-1.5 block text-right hover:underline">Mot de passe oublié ?</a>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-3.5 rounded-full text-white font-semibold disabled:opacity-50"
          style={{ background: '#FF3B5C' }}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>

      <p className="text-center text-zinc-500 mt-8 text-sm">
        Pas encore de compte ?{' '}
        <a href="/register" className="font-semibold" style={{ color: '#FF3B5C' }}>S&rsquo;inscrire</a>
      </p>
    </div>
  )
}
