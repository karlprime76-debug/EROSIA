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
    <div className="flex-1 flex flex-col bg-[#141414] px-8 justify-center max-w-sm mx-auto w-full">
      <h2 className="text-2xl font-bold mb-1">Content de te revoir</h2>
      <p className="text-[#9E9488] mb-8">Connecte-toi pour continuer l&rsquo;aventure</p>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Email</label>
          <input type="email" placeholder="ton@email.com" value={email}
            onChange={(e) => setEmail(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl border border-[#2A2826] text-base outline-none focus:border-[#D92D4A]" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Mot de passe</label>
          <input type="password" placeholder="••••••••" value={password}
            onChange={(e) => setPassword(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl border border-[#2A2826] text-base outline-none focus:border-[#D92D4A]" />
          <a href="/forgot-password" className="text-xs text-[#6B6258] mt-1.5 block text-right hover:underline">Mot de passe oublié ?</a>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-3.5 rounded-full text-white font-semibold disabled:opacity-50"
          style={{ background: '#D92D4A' }}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>

      <p className="text-center text-[#9E9488] mt-8 text-sm">
        Pas encore de compte ?{' '}
        <a href="/register" className="font-semibold" style={{ color: '#D92D4A' }}>S&rsquo;inscrire</a>
      </p>
    </div>
  )
}
