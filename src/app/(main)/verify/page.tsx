'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BadgeCheck, Clock, Shield, ExternalLink } from 'lucide-react'
import { getVerificationStatus, createDiditSession } from '@/lib/api'
import { DiditSdk } from '@didit-protocol/sdk-web'
import { useToast } from '@/components/Toast'

export default function VerifyPage() {
  const router = useRouter()
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    getVerificationStatus().then(s => setStatus(s.status)).catch(() => { toast('Erreur chargement statut', 'error') }).finally(() => setLoading(false))
  }, [toast])

  const handleDiditVerify = async () => {
    setVerifying(true)
    try {
      const { url, error } = await createDiditSession()
      if (error || !url) {
        toast(error ?? 'Erreur lors de la création de la session', 'error')
        return
      }
      DiditSdk.shared.onComplete = (result: { type: string; session?: { status?: string }; error?: { message?: string } }) => {
        if (result.type === 'completed' && (result.session?.status === 'Approved' || result.session?.status === 'approved')) {
          setStatus('approved')
          toast('Vérification réussie !', 'success')
        } else if (result.type === 'completed') {
          setStatus('pending')
          toast('Vérification en cours de revue', 'info')
        } else if (result.type === 'cancelled') {
          toast('Vérification annulée', 'info')
        } else if (result.type === 'failed') {
          toast('Échec de la vérification', 'error')
        }
        DiditSdk.shared.onComplete = undefined
      }
      DiditSdk.shared.startVerification({ url })
    } catch {
      toast('Erreur lors de la vérification', 'error')
    } finally {
      setVerifying(false)
    }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <h1 className="sr-only">Vérification d&rsquo;identité</h1>
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Vérification</h2>
      </header>
      <div className="flex-1 px-4 pb-8">
        {status === 'approved' ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-5 px-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--success)]/20 to-transparent flex items-center justify-center border-2 border-[var(--success)]/30">
              <BadgeCheck size={44} className="text-[var(--successVibrant)]" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xl font-bold">Compte vérifié ✓</p>
              <p className="text-sm text-secondary leading-relaxed">
                Ton identité a déjà été vérifiée. Tu portes fièrement le badge de confiance sur ton profil.
              </p>
            </div>
            <div className="mt-2 px-4 py-2 rounded-xl bg-[var(--success)]/8 border border-[var(--success)]/15 text-xs text-[var(--successVibrant)] font-medium flex items-center gap-2">
              <BadgeCheck size={14} /> Badge vérifié actif
            </div>
          </div>
        ) : status === 'pending' ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <Clock size={48} className="text-[var(--warningVibrant)]" />
            <p className="text-lg font-semibold">Vérification en cours</p>
            <p className="text-sm text-secondary">Ton identité est en cours de vérification. Tu recevras une notification dès que c&rsquo;est terminé.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent mx-auto flex items-center justify-center border border-primary/10">
                <Shield size={32} className="text-primary" />
              </div>
              <p className="text-lg font-semibold">Vérifie ton identité</p>
              <p className="text-sm text-secondary leading-relaxed">
                Didit vérifie ton identité en quelques minutes. Il te suffit de prendre une photo de ta pièce d&rsquo;identité et un selfie.
              </p>
              <button type="button" onClick={handleDiditVerify} disabled={verifying}
                className="w-full py-3.5 rounded-full font-semibold text-on-primary transition-all duration-300 active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'var(--primary)' }}>
                {verifying ? 'Ouverture...' : <><ExternalLink size={16} /> Vérifier avec Didit</>}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
