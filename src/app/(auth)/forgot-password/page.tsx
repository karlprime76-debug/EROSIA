'use client'

import { useState } from 'react'
import { resetPassword } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await resetPassword(email)
    if (error) { setError(error); setLoading(false); return }
    setSent(true); setLoading(false)
  }

  if (sent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-8 text-center">
        <span className="text-6xl mb-4">📧</span>
        <h2 className="text-2xl font-bold mb-2">Email envoyé !</h2>
        <p className="text-zinc-500 mb-2">Vérifie ta boîte de réception.</p>
        <p className="text-zinc-400 text-sm mb-8">Un lien de réinitialisation t&rsquo;a été envoyé à {email}</p>
        <a href="/login" className="py-3.5 px-8 rounded-full text-white font-semibold" style={{ background: '#FF3B5C' }}>
          Retour à la connexion
        </a>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white px-8 justify-center max-w-sm mx-auto w-full">
      <h2 className="text-2xl font-bold mb-1">Mot de passe oublié</h2>
      <p className="text-zinc-500 mb-8">Reçois un lien pour en créer un nouveau</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Email</label>
          <input type="email" placeholder="ton@email.com" value={email}
            onChange={e => setEmail(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-base outline-none focus:border-rose-400" />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-3.5 rounded-full text-white font-semibold disabled:opacity-50"
          style={{ background: '#FF3B5C' }}>
          {loading ? 'Envoi...' : 'Envoyer le lien'}
        </button>
      </form>

      <p className="text-center text-zinc-500 mt-8 text-sm">
        <a href="/login" className="font-semibold" style={{ color: '#FF3B5C' }}>Retour</a>
      </p>
    </div>
  )
}
