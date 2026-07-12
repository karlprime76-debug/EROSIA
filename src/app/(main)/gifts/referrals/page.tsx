'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Gift, Check, Copy, Share2 } from 'lucide-react'
import { getReferralCode, getReferralStats } from '@/lib/referrals'
import { logger } from '@/lib/logger'

export default function ReferralsPage() {
  const router = useRouter()
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [referralStats, setReferralStats] = useState({ total: 0, joined: 0, canRedeem: false, rewarded: false })
  const [copied, setCopied] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemMsg, setRedeemMsg] = useState('')

  useEffect(() => {
    getReferralCode().then(setReferralCode)
    getReferralStats().then(setReferralStats)
  }, [])

  const copyCode = useCallback(() => {
    if (!referralCode) return
    navigator.clipboard.writeText(referralCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(e => logger.error('Copy referral code error', e))
  }, [referralCode])

  const shareLink = useCallback(() => {
    if (!referralCode) return
    const url = `${window.location.origin}/register?ref=${referralCode}`
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(e => logger.error('Copy share link error', e))
  }, [referralCode])

  const handleRedeem = useCallback(async () => {
    setRedeeming(true); setRedeemMsg('')
    try {
      const res = await fetch('/api/referrals/redeem', { method: 'POST' })
      const data = await res.json()
      if (res.ok) { setRedeemMsg('30 jours Premium offerts !'); getReferralStats().then(setReferralStats) }
      else setRedeemMsg(data.error ?? 'Erreur')
    } catch { setRedeemMsg('Erreur réseau') }
    finally { setRedeeming(false) }
  }, [])

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.push('/gifts')} aria-label="Retour" className="p-2.5 rounded-xl"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Parrainage</h2>
      </header>
      <div className="flex-1 px-4 pb-8 overflow-y-auto space-y-4">
        <div className="glass-card rounded-2xl p-5 text-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accentOrange)]/60 flex items-center justify-center mx-auto mb-3">
            <Gift size={22} className="text-on-primary" />
          </div>
          <h3 className="text-lg font-bold">Parraine tes amis</h3>
          <p className="text-sm text-secondary mt-1">Invite tes amis à rejoindre Erosia et gagne <strong className="text-primary">30 jours Premium</strong> pour chaque tranche de <strong>5 filleuls</strong>.</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs text-secondary uppercase tracking-wider font-semibold mb-3">Ton code de parrainage</p>
          {referralCode ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-3 rounded-xl text-base font-mono font-bold tracking-[0.3em] text-center"
                style={{ background: 'var(--surfaceElevated)', border: '1px solid var(--border)', color: 'var(--primary)' }}>{referralCode}</code>
              <button type="button" onClick={copyCode} aria-label="Copier le code" className="p-3 rounded-xl transition active:scale-90" style={{ background: 'var(--surfaceElevated)' }}>
                {copied ? <Check size={16} className="text-[var(--successVibrant)]" /> : <Copy size={16} style={{ color: 'var(--textSecondary)' }} />}
              </button>
              <button type="button" onClick={shareLink} aria-label="Copier le lien de parrainage" className="p-3 rounded-xl transition active:scale-90" style={{ background: 'var(--surfaceElevated)' }}>
                <Share2 size={16} style={{ color: 'var(--textSecondary)' }} />
              </button>
            </div>
          ) : <div className="animate-pulse h-12 rounded-xl" style={{ background: 'var(--surfaceElevated)' }} />}
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-secondary uppercase tracking-wider font-semibold">Tes filleuls</p>
            <span className="text-xs font-medium text-secondary"><strong className="text-primary">{referralStats.joined}</strong> inscrits sur <strong>5</strong></span>
          </div>
          <div className="flex items-center gap-1.5 mb-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`flex-1 h-2.5 rounded-full transition-all duration-500 ${i <= referralStats.joined ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--accentOrange)]' : ''}`}
                style={i > referralStats.joined ? { background: 'var(--surfaceElevated)' } : undefined} />
            ))}
          </div>
          {referralStats.canRedeem ? (
            <button type="button" onClick={handleRedeem} disabled={redeeming}
              className="w-full py-3 rounded-full text-sm font-semibold text-on-primary transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--accentOrange))' }}>
              {redeeming ? 'Récompense en cours...' : '🎉 Réclamer 30 jours Premium'}
            </button>
          ) : referralStats.rewarded && referralStats.joined < 5 ? (
            <p className="text-sm font-medium flex items-center gap-2 text-[var(--successVibrant)]"><Check size={16} /> Récompense déjà obtenue — trouve encore {5 - referralStats.joined} filleul{5 - referralStats.joined > 1 ? 's' : ''} pour re-débloquer 30 jours</p>
          ) : (
            <p className="text-sm text-secondary">{referralStats.joined > 0 ? `Plus que ${5 - referralStats.joined} filleul${5 - referralStats.joined > 1 ? 's' : ''} pour débloquer 30 jours Premium` : 'Partage ton code avec tes amis pour commencer'}</p>
          )}
          {redeemMsg && <p className="text-sm text-secondary mt-2">{redeemMsg}</p>}
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs text-secondary uppercase tracking-wider font-semibold mb-3">Comment ça marche</p>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Partage ton code de parrainage avec tes amis' },
              { step: '2', text: 'Ils s\'inscrivent avec ton code' },
              { step: '3', text: 'Quand 5 amis ont rejoint, tu débloques 30 jours Premium' },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)' }}>{s.step}</div>
                <p className="text-sm text-secondary">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
