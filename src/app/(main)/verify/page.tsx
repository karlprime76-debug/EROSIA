'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BadgeCheck, Clock, Shield, ExternalLink, AlertTriangle, RefreshCw, RotateCcw, Hourglass, HelpCircle } from 'lucide-react'
import { getVerificationStatus, createDiditSession } from '@/lib/api'
import { DiditSdk } from '@didit-protocol/sdk-web'
import { useToast } from '@/components/Toast'
import { supabase } from '@/lib/supabase/client'

function normalizeStatus(s: string | undefined | null): string {
  if (!s) return 'none'
  const map: Record<string, string> = {
    approved: 'approved', Approved: 'approved',
    declined: 'rejected', Declined: 'rejected', rejected: 'rejected',
    pending: 'pending', Pending: 'pending',
    expired: 'expired', Expired: 'expired',
    'in review': 'manual_review', 'In Review': 'manual_review', manual_review: 'manual_review',
    unknown: 'unknown',
  }
  return map[s] ?? 'unknown'
}

export default function VerifyPage() {
  const router = useRouter()
  const [status, setStatus] = useState<string | null>(null)
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchStatus = useCallback(async () => {
    setError(null)
    try {
      const result = await getVerificationStatus()
      if (result && result.status) {
        setStatus(normalizeStatus(result.status))
        setVerifiedAt(result.verified_at)
        setRejectionReason(result.rejection_reason)
      } else {
        setStatus(null)
        setVerifiedAt(null)
      }
    } catch {
      setError('Impossible de charger le statut de vérification')
    }
  }, [])

  useEffect(() => {
    getVerificationStatus().then(result => {
      if (result && result.status) {
        setStatus(normalizeStatus(result.status))
        setVerifiedAt(result.verified_at)
        setRejectionReason(result.rejection_reason)
      } else {
        setStatus(null)
        setVerifiedAt(null)
      }
    }).catch(() => {
      setError('Impossible de charger le statut de vérification')
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      channelRef.current = supabase
        .channel('profile_verification')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          () => { fetchStatus() },
        )
        .subscribe()
    })
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [fetchStatus])

  const handleDiditVerify = async () => {
    setVerifying(true)
    try {
      const { url, error: sessionError } = await createDiditSession()
      if (sessionError || !url) {
        toast(sessionError ?? 'Erreur lors de la création de la session', 'error')
        return
      }
      DiditSdk.shared.onComplete = async (result: { type: string; session?: { id?: string; status?: string }; error?: { message?: string } }) => {
        const sessionId = result.session?.id || (result.session as unknown as string)
        const sessionStatus = normalizeStatus(result.session?.status)
        try {
          await fetch('/api/verify/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: (await supabase.auth.getUser()).data.user?.id,
              sessionId,
            }),
          })
        } catch {
          // Persist best-effort
        }
        if (result.type === 'completed') {
          if (sessionStatus === 'approved') {
            setStatus('approved')
            setVerifiedAt(new Date().toISOString())
            toast('Vérification réussie !', 'success')
          } else if (sessionStatus === 'manual_review') {
            setStatus('manual_review')
            toast('Votre dossier est en cours d\'examen', 'info')
          } else {
            setStatus(sessionStatus)
            toast('Vérification en cours de revue', 'info')
          }
        } else if (result.type === 'cancelled') {
          toast('Vérification annulée', 'info')
          await fetchStatus()
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

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchStatus()
    setRefreshing(false)
  }

  const handleRetry = async () => {
    setStatus(null)
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
              <p className="text-xl font-bold">Compte vérifié</p>
              <p className="text-sm text-secondary leading-relaxed">
                Votre identité a été vérifiée avec succès.<br />Votre badge vérifié est maintenant actif.
              </p>
            </div>
            {verifiedAt && (
              <p className="text-xs text-tertiary">Vérifié le {new Date(verifiedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            )}
            <div className="mt-2 px-4 py-2 rounded-xl bg-[var(--success)]/8 border border-[var(--success)]/15 text-xs text-[var(--successVibrant)] font-medium flex items-center gap-2">
              <BadgeCheck size={14} /> Badge vérifié actif
            </div>
          </div>
        ) : status === 'pending' ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-6">
            <Clock size={48} className="text-[var(--warningVibrant)]" />
            <p className="text-lg font-semibold">Vérification en cours</p>
            <p className="text-sm text-secondary leading-relaxed">
              Votre identité est en cours de vérification. Vous recevrez une notification dès que c&rsquo;est terminé.
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 text-sm font-medium text-primary transition-opacity disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
        ) : status === 'rejected' ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-5 px-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--danger)]/20 to-transparent flex items-center justify-center border-2 border-[var(--danger)]/30">
              <AlertTriangle size={44} className="text-[var(--dangerVibrant)]" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xl font-bold">Vérification refusée</p>
              <p className="text-sm text-secondary leading-relaxed">
                Votre vérification d&rsquo;identité a été refusée.
              </p>
              {rejectionReason && (
                <p className="text-xs text-[var(--dangerVibrant)] mt-2 px-3 py-1.5 rounded-lg bg-[var(--danger)]/10 inline-block">
                  Raison : {rejectionReason}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="w-full py-3.5 rounded-full font-semibold text-on-primary transition-all duration-300 active:scale-[0.97] flex items-center justify-center gap-2"
              style={{ background: 'var(--primary)' }}
            >
              <RotateCcw size={16} /> Recommencer la vérification
            </button>
          </div>
        ) : status === 'expired' ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-5 px-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--warning)]/20 to-transparent flex items-center justify-center border-2 border-[var(--warning)]/30">
              <Hourglass size={44} className="text-[var(--warningVibrant)]" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xl font-bold">Vérification expirée</p>
              <p className="text-sm text-secondary leading-relaxed">
                Votre session de vérification a expiré. Veuillez relancer une vérification.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="w-full py-3.5 rounded-full font-semibold text-on-primary transition-all duration-300 active:scale-[0.97] flex items-center justify-center gap-2"
              style={{ background: 'var(--primary)' }}
            >
              <RotateCcw size={16} /> Relancer la vérification
            </button>
          </div>
        ) : status === 'manual_review' ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-6">
            <Hourglass size={48} className="text-[var(--warningVibrant)]" />
            <p className="text-lg font-semibold">Examen manuel en cours</p>
            <p className="text-sm text-secondary leading-relaxed">
              Votre dossier est en cours d&rsquo;examen par notre équipe. Vous recevrez une réponse sous 24 à 48 heures.
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 text-sm font-medium text-primary transition-opacity disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
        ) : status === 'unknown' || error ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-6">
            <HelpCircle size={48} className="text-[var(--dangerVibrant)]" />
            <p className="text-lg font-semibold">Statut inconnu</p>
            <p className="text-sm text-secondary leading-relaxed">
              {error ?? 'Impossible de déterminer le statut de votre vérification.'}
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 text-sm font-medium text-primary transition-opacity disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Actualiser
            </button>
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
