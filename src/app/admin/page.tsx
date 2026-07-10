'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getModerationQueue, reviewContent } from '@/lib/api'
import { Smartphone, Gift, Users, ShieldAlert, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { logger } from '@/lib/logger'

interface VerificationRequest {
  id: string; user_id: string; photo_url: string; status: string; created_at: string
  profile?: { name: string; photos: string[] }
}
interface ModerationItem {
  id: string; content_type: string; content_id: string; content_text?: string; status?: string; reviewed: boolean; created_at: string
}

export default function AdminPage() {
  const [userEmail, setUserEmail] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)
  const [verifications, setVerifications] = useState<VerificationRequest[]>([])
  const [modQueue, setModQueue] = useState<ModerationItem[]>([])
  const [tab, setTab] = useState<'apercu' | 'verifications' | 'moderation' | 'retraits'>('apercu')
  const [stats, setStats] = useState<{ totalGifts: number; totalUsers: number; pendingVerifs: number; pendingPayouts: number; totalPayoutsAll: number } | null>(null)
  const [payouts, setPayouts] = useState<Array<{ id: string; user_id: string; user_name: string; amount_cents: number; payment_details: string; status: string; created_at: string }>>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadData = async () => {
    const { data: vData } = await supabase
      .from('verification_requests')
      .select('*, profile:profiles!verification_requests_user_id_fkey(id, name, photos)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (vData) setVerifications(vData as unknown as VerificationRequest[])
    const { data: mData } = await getModerationQueue()
    if (mData) setModQueue(mData as ModerationItem[])
  }

  const loadAdminData = async () => {
    setLoading(true)
    const res = await fetch('/api/admin')
    if (res.ok) {
      const data = await res.json()
      setStats(data.stats)
      setPayouts(data.payouts ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setChecking(false); return }
      setUserEmail(user.email ?? '')
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
      if (data?.is_admin) {
        setIsAdmin(true)
        await Promise.all([loadData(), loadAdminData()])
      }
      setChecking(false)
    }).catch(logger.error)
  }, [])

  const handleVerify = async (reqId: string, userId: string, approved: boolean) => {
    const label = approved ? 'Approuver' : 'Rejeter'
    if (!window.confirm(`${label} cette demande de vérification ?`)) return
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: reqId, userId, approved }),
    })
    if (!res.ok) { const d = await res.json(); return toast(d.error, 'error') }
    setVerifications(v => v.filter(r => r.id !== reqId))
  }

  const handleModeration = async (id: string, approved: boolean) => {
    await reviewContent(id, approved)
    setModQueue(m => m.filter(i => i.id !== id))
  }

  const handlePayoutAction = async (txId: string, status: 'completed' | 'failed') => {
    const res = await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txId, status }),
    })
    if (!res.ok) { const d = await res.json(); toast(d.error, 'error'); return }
    setPayouts(p => p.filter(tx => tx.id !== txId))
  }

  if (checking) return (
    <div className="min-h-dvh flex items-center justify-center px-6 bg-transparent">
      <div className="glass-card rounded-3xl p-8 max-w-sm w-full text-center">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-secondary text-sm">Vérification...</p>
      </div>
    </div>
  )

  if (!isAdmin) return (
    <div className="min-h-dvh flex items-center justify-center px-6 bg-transparent">
      <div className="glass-card rounded-3xl p-8 max-w-sm w-full text-center">
        <h2 className="text-xl font-bold mb-2">Accès restreint</h2>
        <p className="text-secondary text-sm">{userEmail ? 'Accès admin uniquement' : 'Connecte-toi avec un compte admin'}</p>
      </div>
    </div>
  )

  const tabs = [
    { key: 'apercu', label: 'Aperçu' },
    { key: 'verifications', label: `Vérifications (${verifications.length})` },
    { key: 'moderation', label: `Modération (${modQueue.length})` },
    { key: 'retraits', label: `Retraits (${stats?.pendingPayouts ?? 0})` },
  ] as const

  return (
    <div className="min-h-dvh bg-transparent px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Administration</h2>
        <button type="button" aria-label="Rafraîchir" onClick={() => { loadData(); loadAdminData() }} className="p-2 text-secondary hover:text-theme transition"><RefreshCw size={18} /></button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button type="button" key={t.key} onClick={() => setTab(t.key)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition ${tab === t.key ? 'bg-primary text-on-primary' : 'bg-surface-elevated text-secondary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'apercu' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-2xl p-4">
              <Users size={20} className="text-info mb-2" />
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-[10px] text-secondary">Utilisateurs</p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <Gift size={20} className="text-warning mb-2" />
              <p className="text-2xl font-bold">{stats.totalGifts}</p>
              <p className="text-[10px] text-secondary">Cadeaux envoyés</p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <ShieldAlert size={20} className="text-info mb-2" />
              <p className="text-2xl font-bold">{stats.pendingVerifs}</p>
              <p className="text-[10px] text-secondary">Vérifications en attente</p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <Smartphone size={20} className="text-success mb-2" />
              <p className="text-2xl font-bold">{stats.pendingPayouts}</p>
              <p className="text-[10px] text-secondary">Retraits en attente</p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-4">
            <p className="text-sm text-secondary mb-1">Total retraits effectués</p>
            <p className="text-xl font-bold">{stats.totalPayoutsAll}</p>
          </div>
        </div>
      )}

      {tab === 'verifications' && (
        <div className="space-y-4">
          {verifications.length === 0 && <p className="text-secondary text-sm">Aucune demande en attente</p>}
          {verifications.map(req => (
            <div key={req.id} className="glass-card rounded-2xl p-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-surface-elevated flex items-center justify-center shrink-0 overflow-hidden">
                <ShieldAlert size={20} className="text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{req.profile?.name ?? 'Inconnu'}</p>
                <p className="text-[10px] text-secondary">{new Date(req.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
              <button type="button" onClick={() => handleVerify(req.id, req.user_id, true)}
                className="px-4 py-2 rounded-full text-xs font-medium bg-[var(--successBg)] text-[var(--success)] hover:bg-[color-mix(in_srgb,var(--success)_25%,transparent)] transition">Approuver</button>
              <button type="button" onClick={() => handleVerify(req.id, req.user_id, false)}
                className="px-4 py-2 rounded-full text-xs font-medium bg-[var(--errorBg)] text-[var(--error)] hover:bg-[color-mix(in_srgb,var(--error)_25%,transparent)] transition">Rejeter</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'moderation' && (
        <div className="space-y-4">
          {modQueue.length === 0 && <p className="text-secondary text-sm">Aucun contenu à modérer</p>}
          {modQueue.map(item => (
            <div key={item.id} className="glass-card rounded-2xl p-4">
              <p className="text-xs font-medium text-primary uppercase">{item.content_type}</p>
              {item.content_text && <p className="text-sm mt-1">{item.content_text}</p>}
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => handleModeration(item.id, true)}
                  className="px-4 py-2 rounded-full text-xs font-medium bg-[var(--successBg)] text-[var(--success)] hover:bg-[color-mix(in_srgb,var(--success)_25%,transparent)] transition">Approuver</button>
                <button type="button" onClick={() => handleModeration(item.id, false)}
                  className="px-4 py-2 rounded-full text-xs font-medium bg-[var(--errorBg)] text-[var(--error)] hover:bg-[color-mix(in_srgb,var(--error)_25%,transparent)] transition">Rejeter</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'retraits' && (
        <div className="space-y-4">
          {loading && <p className="text-secondary text-sm">Chargement...</p>}
          {!loading && payouts.length === 0 && <p className="text-secondary text-sm">Aucun retrait en attente</p>}
          {payouts.map(tx => {
            let details = { type: '', identifier: '' }
            try { details = JSON.parse(tx.payment_details ?? '{}') } catch {}
            return (
              <div key={tx.id} className="glass-card rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-warning" />
                    <p className="font-medium text-sm">{tx.user_name}</p>
                  </div>
                  <p className="font-bold text-sm">{tx.amount_cents.toLocaleString('fr-FR')} F</p>
                </div>
                <p className="text-[10px] text-secondary mb-3">
                  {details.identifier || 'Inconnu'} — {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handlePayoutAction(tx.id, 'completed')}
                    className="flex-1 py-2 rounded-full text-xs font-medium bg-[var(--successBg)] text-[var(--success)] hover:bg-[color-mix(in_srgb,var(--success)_25%,transparent)] transition flex items-center justify-center gap-1">
                    <CheckCircle size={12} /> Marquer effectué
                  </button>
                  <button type="button" onClick={() => handlePayoutAction(tx.id, 'failed')}
                    className="flex-1 py-2 rounded-full text-xs font-medium bg-[var(--errorBg)] text-[var(--error)] hover:bg-[color-mix(in_srgb,var(--error)_25%,transparent)] transition flex items-center justify-center gap-1">
                    <XCircle size={12} /> Marquer échoué
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
