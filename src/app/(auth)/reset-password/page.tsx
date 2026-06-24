'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setLoading(false)
      }
    })
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
      <div className="flex-1 flex flex-col items-center justify-center bg-[#141414] px-8 text-center">
        <span className="text-6xl mb-4">✅</span>
        <h2 className="text-2xl font-bold mb-2">Mot de passe mis à jour !</h2>
        <button onClick={() => router.push('/login')}
          className="mt-8 py-3.5 px-8 rounded-full text-white font-semibold" style={{ background: '#D92D4A' }}>
          Se connecter
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#141414] px-8 justify-center max-w-sm mx-auto w-full">
      <h2 className="text-2xl font-bold mb-1">Nouveau mot de passe</h2>
      <p className="text-[#9E9488] mb-8">Choisis un mot de passe sécurisé</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Mot de passe</label>
          <input type="password" placeholder="••••••••" value={password}
            onChange={e => setPassword(e.target.value)} required minLength={6}
            className="w-full px-4 py-3 rounded-xl border border-[#2A2826] text-base outline-none focus:border-[#D92D4A]" />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-3.5 rounded-full text-white font-semibold disabled:opacity-50"
          style={{ background: '#D92D4A' }}>
          {loading ? 'Mise à jour...' : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}
