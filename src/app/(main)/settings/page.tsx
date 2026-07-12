'use client'

import { useState, useEffect, useRef, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Eye, EyeOff, Trash2, Crown, MapPin, Lock, User, Check, X, Shield, Globe } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { getSubscriptionStatus, createCheckoutSession, getTravelMode, setTravelMode, getGhostMode, setGhostMode as setGhostModeApi } from '@/lib/api'
import ToggleSwitch from '@/components/ToggleSwitch'
import { useConfirm } from '@/components/ConfirmDialog'
import { logger } from '@/lib/logger'
import { useToast } from '@/components/Toast'
import { useLocale } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/types'

export default function SettingsPage() {
  const router = useRouter()
  const { confirm } = useConfirm()
  const { toast } = useToast()
  const { locale: currentLocale, setLocale } = useLocale()
  const [deleting, setDeleting] = useState(false)
  const [visibility, setVisibility] = useState('all')
  const [notifPush, setNotifPush] = useState(true)
  const [notifEmail, setNotifEmail] = useState(true)
  const [subscriptionTier, setSubscriptionTier] = useState('free')
  const [isPremium, setIsPremium] = useState(false)
  const [travelActive, setTravelActive] = useState(false)
  const [travelCity, setTravelCity] = useState('')
  const [ghostMode, setGhostMode] = useState(false)
  const [upgradeError, setUpgradeError] = useState('')
  const [upgradeSuccess, setUpgradeSuccess] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [profileName, setProfileName] = useState('')
  const [savingName, setSavingName] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('premium') === 'success') {
      startTransition(() => setUpgradeSuccess(true))
      window.history.replaceState(null, '', '/settings')
    }
    getSubscriptionStatus().then(r => { setSubscriptionTier(r.tier); setIsPremium(r.tier === 'premium') }).catch(logger.error)
    getTravelMode().then(mode => {
      setTravelActive(mode.active)
      setTravelCity(mode.city ?? '')
    }).catch(logger.error)
    getGhostMode().then(setGhostMode).catch(logger.error)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('name, visibility, notif_push, notif_email').eq('id', user.id).maybeSingle().then(({ data }) => {
        if (data) {
          if (data.name) { setProfileName(data.name); setNameValue(data.name) }
          if (data.visibility) setVisibility(data.visibility)
          if (data.notif_push !== null) setNotifPush(data.notif_push)
          if (data.notif_email !== null) setNotifEmail(data.notif_email)
        }
      }, (err) => logger.error('Settings error', { error: String(err) }))
    }).catch(logger.error).finally(() => setSettingsLoaded(true))
  }, [router])

  useEffect(() => {
    if (!upgradeSuccess) return
    let attempts = 0
    const id = setInterval(async () => {
      attempts++
      const { tier } = await getSubscriptionStatus().catch(() => ({ tier: 'free' as const }))
      if (tier === 'premium') {
        setSubscriptionTier('premium')
        setIsPremium(true)
        clearInterval(id)
      } else if (attempts >= 10) {
        clearInterval(id)
      }
    }, 2000)
    return () => clearInterval(id)
  }, [upgradeSuccess])

  async function updateProfileField(patch: Record<string, unknown>) {
  try {
    const res = await fetch('/api/profile/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) { const j = await res.json(); logger.error('Profile update error', j) }
  } catch (e) { logger.error('Profile update network error', e) }
}

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const deletePasswordRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (showDeleteModal) setTimeout(() => deletePasswordRef.current?.focus(), 100) }, [showDeleteModal])

  const handleDelete = async () => {
    if (!deletePassword) return
    if (!(await confirm('Supprimer définitivement ton compte ? Cette action est irréversible.'))) return
    setDeleting(true)
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error || 'Erreur lors de la suppression', 'error'); setDeleting(false); return }
      await supabase.auth.signOut()
      router.push('/')
    } catch (e) {
      logger.error('Delete account error', e)
      toast('Erreur réseau. Vérifie ta connexion.', 'error')
      setDeleting(false)
    }
  }

  const handleUpgrade = async () => {
    setUpgradeError('')
    try {
      const result = await createCheckoutSession()
      if (result.url) { window.location.href = result.url; return }
      setUpgradeError(result.error ?? 'Erreur de paiement.')
    } catch {
      setUpgradeError('Erreur réseau. Vérifie ta connexion.')
    }
  }

  const handleTravelToggle2 = async (v: boolean) => {
    if (v && !isPremium) { setUpgradeError('Mode voyage réservé aux membres Premium.'); return }
    setTravelActive(v)
    await setTravelMode(travelCity, v)
  }

  const handleGhostToggle = async (v: boolean) => {
    if (v && !isPremium) { setUpgradeError('Mode fantôme réservé aux membres Premium.'); return }
    setGhostMode(v)
    await setGhostModeApi(v)
  }

  const saveTravelCity = async () => {
    await setTravelMode(travelCity, travelActive)
  }

  const visibilityOptions = [
    { value: 'all', label: 'Tout le monde' },
    { value: 'matches', label: 'Mes matchs seulement' },
    { value: 'none', label: 'Personne' },
  ]

  const sections: { title: string; items: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; desc?: string; danger?: boolean; onClick?: () => void; render?: () => React.ReactNode }[] }[] = [
    {
      title: 'Confidentialité',
      items: [
        {
          icon: Eye, label: 'Qui peut te voir',
          render: () => (
            <div className="flex gap-2 mt-1">
              {visibilityOptions.map(o => (
                <button type="button" key={o.value} onClick={() => { setVisibility(o.value); updateProfileField({ visibility: o.value }).catch(logger.error) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${visibility === o.value ? 'bg-[var(--primary)] text-[var(--textOnPrimary)]' : 'bg-[var(--surfaceElevated)] text-[var(--textSecondary)]'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          ),
        },
        {
          icon: Bell, label: 'Notifications',
          render: () => (
            <div className="space-y-2 mt-1">
              <label className="flex items-center justify-between">
                <span className="text-xs text-[var(--textSecondary)]">Push</span>
                <button type="button" role="switch" aria-checked={notifPush} onClick={() => { const v = !notifPush; setNotifPush(v); updateProfileField({ notif_push: v }).catch(logger.error) }}
                  className={`w-10 h-5 rounded-full transition relative ${notifPush ? 'bg-[var(--primary)]' : 'bg-[var(--surfaceElevated)]'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-[var(--textOnPrimary)] transition ${notifPush ? 'left-5' : 'left-0.5'}`} />
                </button>
              </label>
              <label className="flex items-center justify-between">
                <span className="text-xs text-[var(--textSecondary)]">Email</span>
                <button type="button" role="switch" aria-checked={notifEmail} onClick={() => { const v = !notifEmail; setNotifEmail(v); updateProfileField({ notif_email: v }).catch(logger.error) }}
                  className={`w-10 h-5 rounded-full transition relative ${notifEmail ? 'bg-[var(--primary)]' : 'bg-[var(--surfaceElevated)]'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-[var(--textOnPrimary)] transition ${notifEmail ? 'left-5' : 'left-0.5'}`} />
                </button>
              </label>
              <button type="button" onClick={() => router.push('/notifications/preferences')}
                className="text-xs font-medium mt-1" style={{ color: 'var(--primary)' }}>
                Gérer les notifications →
              </button>
            </div>
          ),
        },
        {
          icon: EyeOff, label: 'Mode fantôme',
          desc: ghostMode ? 'Invisible pour les autres' : 'Visible',
          render: () => (
            isPremium ? <ToggleSwitch enabled={ghostMode} onChange={handleGhostToggle} />
              : <Lock size={16} className="text-[var(--textSecondary)]" />
          ),
        },
      ],
    },
    {
      title: 'Sécurité & Confidentialité',
      items: [
        {
          icon: Shield, label: 'Centre de sécurité',
          desc: 'Conseils, consentement, blocages et signalements',
          onClick: () => router.push('/safety'),
        },
      ],
    },
    {
      title: 'Langue',
      items: [
        {
          icon: Globe, label: 'Langue',
          render: () => (
            <div className="flex gap-2 mt-1">
              {(['fr', 'en'] as Locale[]).map(l => (
                <button type="button" key={l} onClick={() => setLocale(l)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${currentLocale === l ? 'bg-[var(--primary)] text-[var(--textOnPrimary)]' : 'bg-[var(--surfaceElevated)] text-[var(--textSecondary)]'}`}>
                  {l === 'fr' ? 'Français' : 'English'}
                </button>
              ))}
            </div>
          ),
        },
      ],
    },
    {
      title: 'Compte',
      items: [
        {
          icon: User, label: 'Mon pseudo',
          desc: profileName || 'Non défini',
          render: () => editingName ? (
            <div className="flex items-center gap-1 mt-2">
              <div className="flex-1">
                <input value={nameValue} onChange={e => setNameValue(e.target.value.slice(0, 80))} aria-label="Modifier le nom"
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      if (!nameValue.trim() || nameValue.trim().length < 2) return
                      setSavingName(true)
                      const res = await fetch('/api/profile/me', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: nameValue.trim() }),
                      })
                      if (res.ok) { setProfileName(nameValue.trim()); setEditingName(false) }
                      else { logger.error('Save name error', await res.json()) }
                      setSavingName(false)
                    }
                    if (e.key === 'Escape') { setNameValue(profileName); setEditingName(false) }
                  }}
                  className="w-full rounded-lg bg-[var(--surfaceElevated)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--textPrimary)] outline-none focus:border-[var(--primary)]"
                  autoFocus maxLength={80}
                />
                <p className="text-[10px] text-right text-[var(--textSecondary)] mt-0.5">{nameValue.length}/80</p>
              </div>
              <button type="button" aria-label="Enregistrer" onClick={() => { (async () => {
                if (!nameValue.trim() || nameValue.trim().length < 2) return
                setSavingName(true)
                const res = await fetch('/api/profile/me', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: nameValue.trim() }),
                })
                if (res.ok) { setProfileName(nameValue.trim()); setEditingName(false) }
                else { logger.error('Save name error', await res.json()) }
                setSavingName(false)
              })().catch(logger.error) }} disabled={savingName}
                className="rounded-full p-2.5 text-[var(--successVibrant)] hover:bg-[var(--surfaceElevated)]"><Check size={16} /></button>
              <button type="button" aria-label="Annuler" onClick={() => { setNameValue(profileName); setEditingName(false) }}
                className="rounded-full p-2.5 text-[var(--textSecondary)] hover:bg-[var(--surfaceElevated)]"><X size={16} /></button>
            </div>
          ) : (
            <button type="button" onClick={() => setEditingName(true)}
              className="mt-1 text-xs text-[var(--primary)] font-medium">Modifier</button>
          ),
        },
        {
          icon: Trash2, label: 'Supprimer mon compte', desc: 'Irréversible', danger: true,
          onClick: () => { setShowDeleteModal(true); setDeletePassword('') },
        },
      ],
    },
    {
      title: 'Abonnement',
      items: [
        {
          icon: Crown, label: subscriptionTier === 'premium' ? '✅ Premium actif' : '👑 Erosia Premium',
          desc: subscriptionTier === 'premium' ? 'Compte Premium — tous les avantages débloqués' : 'Compte Gratuit — fonctionnalités limitées',
          render: () => (
            <div className="mt-2 space-y-2">
              {upgradeSuccess && (
                <p className="text-xs text-[var(--successVibrant)] font-medium">Paiement réussi ! Bienvenue sur Premium.</p>
              )}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${subscriptionTier === 'premium' ? 'bg-[var(--successVibrant)]' : 'bg-[var(--textMuted)]'}`} />
                <span className="text-xs text-[var(--textSecondary)]">{subscriptionTier === 'premium' ? 'Premium actif' : 'Compte gratuit'}</span>
              </div>
              {subscriptionTier !== 'premium' && (
                <button type="button" onClick={handleUpgrade}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--textOnPrimary)]"
                  style={{ background: 'linear-gradient(135deg, var(--primary), var(--accentOrange))' }}>
                  Passer à Premium — 5 000 CFA/mois
                </button>
              )}
              {upgradeError && <p className="text-xs text-[var(--primary)]">{upgradeError}</p>}
            </div>
          ),
        },
      ],
    },
    {
      title: 'Voyage',
      items: [
        {
          icon: MapPin, label: 'Mode voyage',
          desc: travelActive ? `Actif : ${travelCity || 'Non défini'}` : 'Inactif',
          render: () => (
            <div className="mt-2 space-y-2">
              <label className="flex items-center justify-between">
                <span className="text-xs text-[var(--textSecondary)]">Activer</span>
                {isPremium ? <ToggleSwitch enabled={travelActive} onChange={handleTravelToggle2} />
                  : <Lock size={16} className="text-[var(--textSecondary)]" />}
              </label>
              {travelActive && (
                <input value={travelCity} onChange={e => setTravelCity(e.target.value)} onBlur={saveTravelCity}
                  placeholder="Nom de la ville..." aria-label="Ville de voyage"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surfaceElevated)] text-sm text-[var(--textPrimary)] border border-[var(--border)] outline-none focus:border-[var(--primary)]"
                />
              )}
            </div>
          ),
        },
      ],
    },
  ]

  if (!settingsLoaded) return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-2.5 rounded-xl"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--textPrimary)' }}>Paramètres</h2>
      </header>
      <div className="flex-1 px-4 space-y-6 pb-8 overflow-y-auto">
        {[1, 2, 3].map(i => (
          <div key={i}>
            <div className="h-3 w-20 bg-[var(--border)] rounded mb-2 animate-pulse" />
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              {[1, 2].map(j => (
                <div key={j} className="px-4 py-3.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded bg-[var(--border)] animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-[var(--border)] rounded animate-pulse" />
                      <div className="h-3 w-24 bg-[var(--border)] rounded mt-1 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <h1 className="sr-only">Paramètres</h1>
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-2.5 rounded-xl"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--textPrimary)' }}>Paramètres</h2>
      </header>
      <div className="flex-1 px-4 space-y-6 pb-8 overflow-y-auto">
        {sections.map(section => (
          <div key={section.title}>
            <h3 className="text-sm font-semibold tracking-wider mb-2 px-1" style={{ color: 'var(--textSecondary)' }}>{section.title}</h3>
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              {section.items.map(({ icon: Icon, label, desc, danger, onClick, render }) => (
                <div key={label}
                  className="px-4 py-3.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <Icon size={20} className={`shrink-0 ${danger ? 'text-[var(--primary)]' : 'text-[var(--textMuted)]'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${danger ? 'text-[var(--primary)]' : ''}`} style={{ color: danger ? undefined : 'var(--textPrimary)' }}>{label}</p>
                      {desc && <p className="text-xs" style={{ color: 'var(--textSecondary)' }}>{desc}</p>}
                    </div>
                    {onClick && !danger && (
                      <button type="button" onClick={onClick}
                        className="text-xs font-medium shrink-0" style={{ color: 'var(--primary)' }}>Modifier</button>
                    )}
                  </div>
                  {render?.()}
                  {danger && (
                    <button type="button" onClick={onClick} disabled={deleting}
                      className="mt-2 px-4 py-2 rounded-lg text-xs font-medium" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>
                      {deleting ? 'Suppression...' : 'Supprimer mon compte'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showDeleteModal && (
        <div aria-hidden="true" role="presentation" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={() => setShowDeleteModal(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowDeleteModal(false) }}>
          <div role="dialog" aria-modal="true" tabIndex={-1} className="w-full max-w-sm bg-[var(--card)] rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">Supprimer le compte</h3>
            <p className="text-xs text-secondary mb-4">Confirme ton mot de passe pour supprimer définitivement ton compte.</p>
            <div className="mb-4">
              <label htmlFor="delete-password" className="text-xs font-medium text-secondary mb-1 block">Mot de passe</label>
              <input id="delete-password" ref={deletePasswordRef} type="password" value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleDelete() }}
                className="w-full px-4 py-3 rounded-xl bg-[var(--surfaceElevated)] text-sm border border-[var(--border)] outline-none focus:border-[var(--primary)]"
                autoComplete="current-password" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 rounded-full text-sm font-medium border border-[var(--border)] text-secondary">Annuler</button>
              <button type="button" onClick={handleDelete} disabled={!deletePassword || deleting}
                className="flex-1 py-3 rounded-full text-sm font-semibold text-on-primary disabled:opacity-40" style={{ background: 'var(--error)' }}>
                {deleting ? 'Suppression...' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
