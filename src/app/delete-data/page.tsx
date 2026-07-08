'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'

export default function DeleteDataPage() {
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({ email })
      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }
      setSent(true)
    } catch { toast('Erreur', 'error'); setLoading(false) }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-theme text-theme p-6 flex flex-col items-center justify-center">
        <div className="glass-card rounded-3xl p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold mb-3">Demande envoyée</h1>
          <p className="text-secondary text-sm">Un email de confirmation vous a été envoyé. Cliquez sur le lien pour confirmer la suppression de vos données.</p>
          <Link href="/login" className="inline-block mt-6 text-primary hover:underline text-sm">Retour à l&rsquo;accueil</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme text-theme p-6">
      <Link href="/login" className="inline-flex items-center gap-2 text-secondary hover:text-theme transition mb-6">
        <ArrowLeft size={20} /> Retour
      </Link>
      <h1 className="text-2xl font-bold mb-2">Suppression des données</h1>
      <p className="text-secondary text-sm mb-6">Entrez votre email pour recevoir un lien de suppression de vos données personnelles.</p>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Votre adresse email"
          required
          className="w-full px-4 py-3 rounded-xl bg-surface-secondary text-theme placeholder:text-muted focus:outline-none focus:border-primary border border-theme transition text-sm"
        />
        {error && <p role="alert" className="text-error text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-3 rounded-full bg-primary text-on-primary font-semibold transition-all active:scale-95 disabled:opacity-50">
          {loading ? 'Envoi...' : 'Envoyer la demande'}
        </button>
      </form>
    </div>
  )
}
