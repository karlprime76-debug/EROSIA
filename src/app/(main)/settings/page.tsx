'use client'

import { useState, useEffect, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Eye, EyeOff, Trash2, Shield as ShieldIcon, Crown, MapPin, Lock, LogOut, User, Check, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { getSubscriptionStatus, createCheckoutSession, getTravelMode, setTravelMode, getGhostMode, setGhostMode as setGhostModeApi, signOut } from '@/lib/api'
import ToggleSwitch from '@/components/ToggleSwitch'
import { useConfirm } from '@/components/ConfirmDialog'

export default function SettingsPage() {
  const router = useRouter()
  const { confirm } = useConfirm()
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
    getSubscriptionStatus().then(r => { setSubscriptionTier(r.tier); setIsPremium(r.tier === 'premium') }).catch(console.error)
    getTravelMode().then(mode => {
      setTravelActive(mode.active)
      setTravelCity(mode.city ?? '')
    }).catch(console.error)
    getGhostMode().then(setGhostMode).catch(console.error)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('name, visibility, notif_push, notif_email').eq('id', user.id).maybeSingle().then(({ data }) => {
        if (data) {
          if (data.name) { setProfileName(data.name); setNameValue(data.name) }
          if (data.visibility) setVisibility(data.visibility)
          if (data.notif_push !== null) setNotifPush(data.notif_push)
          if (data.notif_email !== null) setNotifEmail(data.notif_email)
        }
      }, console.error)
    }).catch(console.error).finally(() => setSettingsLoaded(true))
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

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  const handleDelete = async () => {
    if (!(await confirm('Supprimer définitivement ton compte ? Cette action est irréversible.'))) return
    setDeleting(true)
    try {
      await supabase.from('profiles').delete().eq('id', (await supabase.auth.getUser()).data.user?.id)
      await fetch('/api/auth/delete-account', { method: 'POST' })
      await supabase.auth.signOut()
      router.push('/')
    } catch (e) {
      console.error('Delete account error:', e)
      await supabase.auth.signOut()
      router.push('/')
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
                <button type="button" key={o.value} onClick={() => { (async () => {
                setVisibility(o.value)
                const { data: { user } } = await supabase.auth.getUser()
                if (user) supabase.from('profiles').update({ visibility: o.value }).eq('id', user.id)
              })().catch(console.error) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${visibility === o.value ? 'bg-[#D92D4A] text-white' : 'bg-[#262628] text-[#9E9488]'}`}>
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
                <span className="text-xs text-[#9E9488]">Push</span>
                <button type="button" role="switch" aria-checked={notifPush} onClick={() => { (async () => {
                  const v = !notifPush
                  setNotifPush(v)
                  const { data: { user } } = await supabase.auth.getUser()
                  if (user) supabase.from('profiles').update({ notif_push: v }).eq('id', user.id)
                })().catch(console.error) }}
                  className={`w-10 h-5 rounded-full transition relative ${notifPush ? 'bg-[#D92D4A]' : 'bg-[#262628]'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition ${notifPush ? 'left-5' : 'left-0.5'}`} />
                </button>
              </label>
              <label className="flex items-center justify-between">
                <span className="text-xs text-[#9E9488]">Email</span>
                <button type="button" role="switch" aria-checked={notifEmail} onClick={() => { (async () => {
                  const v = !notifEmail
                  setNotifEmail(v)
                  const { data: { user } } = await supabase.auth.getUser()
                  if (user) supabase.from('profiles').update({ notif_email: v }).eq('id', user.id)
                })().catch(console.error) }}
                  className={`w-10 h-5 rounded-full transition relative ${notifEmail ? 'bg-[#D92D4A]' : 'bg-[#262628]'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition ${notifEmail ? 'left-5' : 'left-0.5'}`} />
                </button>
              </label>
            </div>
          ),
        },
        {
          icon: EyeOff, label: 'Mode fantôme',
          desc: ghostMode ? 'Invisible pour les autres' : 'Visible',
          render: () => (
            isPremium ? <ToggleSwitch enabled={ghostMode} onChange={handleGhostToggle} />
              : <Lock size={16} className="text-[#9E9488]" />
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
                      try {
                        setSavingName(true)
                        const { data: { user } } = await supabase.auth.getUser()
                        if (!user) { setSavingName(false); return }
                        const { error } = await supabase.from('profiles').update({ name: nameValue.trim() }).eq('id', user.id)
                        if (error) { console.error(error); setSavingName(false); return }
                        setProfileName(nameValue.trim())
                        setSavingName(false); setEditingName(false)
                      } catch (err) { console.error(err); setSavingName(false) }
                    }
                    if (e.key === 'Escape') { setNameValue(profileName); setEditingName(false) }
                  }}
                  className="w-full rounded-lg bg-[#262628] border border-[#2A2826] px-3 py-2 text-sm text-white outline-none focus:border-[#D92D4A]"
                  autoFocus maxLength={80}
                />
                <p className="text-[10px] text-right text-[#9E9488] mt-0.5">{nameValue.length}/80</p>
              </div>
              <button type="button" aria-label="Enregistrer" onClick={() => { (async () => {
                if (!nameValue.trim() || nameValue.trim().length < 2) return
                try {
                  setSavingName(true)
                  const { data: { user } } = await supabase.auth.getUser()
                  if (!user) { setSavingName(false); return }
                  const { error } = await supabase.from('profiles').update({ name: nameValue.trim() }).eq('id', user.id)
                  if (error) { console.error(error); setSavingName(false); return }
                  setProfileName(nameValue.trim())
                  setSavingName(false); setEditingName(false)
                } catch (err) { console.error(err); setSavingName(false) }
              })().catch(console.error) }} disabled={savingName}
                className="rounded-full p-1.5 text-green-400 hover:bg-[#262628]"><Check size={16} /></button>
              <button type="button" aria-label="Annuler" onClick={() => { setNameValue(profileName); setEditingName(false) }}
                className="rounded-full p-1.5 text-[#9E9488] hover:bg-[#262628]"><X size={16} /></button>
            </div>
          ) : (
            <button type="button" onClick={() => setEditingName(true)}
              className="mt-1 text-xs text-[#D92D4A] font-medium">Modifier</button>
          ),
        },
        {
          icon: ShieldIcon, label: 'Centre d\'aide',
          onClick: () => window.open('mailto:support@erosia.app', '_blank'),
          desc: 'support@erosia.app',
        },
        {
          icon: LogOut, label: 'Se déconnecter',
          onClick: handleLogout,
        },
        {
          icon: Trash2, label: 'Supprimer mon compte', desc: 'Irréversible', danger: true,
          onClick: handleDelete,
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
                <p className="text-xs text-[#22C55E] font-medium">Paiement réussi ! Bienvenue sur Premium.</p>
              )}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${subscriptionTier === 'premium' ? 'bg-[#22C55E]' : 'bg-[#6B6258]'}`} />
                <span className="text-xs text-[#9E9488]">{subscriptionTier === 'premium' ? 'Premium actif' : 'Compte gratuit'}</span>
              </div>
              {subscriptionTier !== 'premium' && (
                <button type="button" onClick={handleUpgrade}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-white"
                  style={{ background: 'linear-gradient(135deg, #D92D4A, #C85A17)' }}>
                  Passer à Premium — 5 000 CFA/mois
                </button>
              )}
              {upgradeError && <p className="text-xs text-[#D92D4A]">{upgradeError}</p>}
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
                <span className="text-xs text-[#9E9488]">Activer</span>
                {isPremium ? <ToggleSwitch enabled={travelActive} onChange={handleTravelToggle2} />
                  : <Lock size={16} className="text-[#9E9488]" />}
              </label>
              {travelActive && (
                <input value={travelCity} onChange={e => setTravelCity(e.target.value)} onBlur={saveTravelCity}
                  placeholder="Nom de la ville..." aria-label="Ville de voyage"
                  className="w-full px-3 py-2 rounded-lg bg-[#262628] text-sm text-white border border-[#2A2826] outline-none focus:border-[#D92D4A]"
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
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Paramètres</h2>
      </header>
      <div className="flex-1 px-4 space-y-6 pb-8 overflow-y-auto">
        {[1, 2, 3].map(i => (
          <div key={i}>
            <div className="h-3 w-20 bg-[#2A2826] rounded mb-2 animate-pulse" />
            <div className="bg-[#1C1C1E] rounded-xl border border-[#2A2826] overflow-hidden">
              {[1, 2].map(j => (
                <div key={j} className="px-4 py-3.5 border-b border-[#2A2826] last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded bg-[#2A2826] animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-[#2A2826] rounded animate-pulse" />
                      <div className="h-3 w-24 bg-[#2A2826] rounded mt-1 animate-pulse" />
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
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Paramètres</h2>
      </header>
      <div className="flex-1 px-4 space-y-6 pb-8 overflow-y-auto">
        {sections.map(section => (
          <div key={section.title}>
            <h3 className="text-sm font-semibold text-[#9E9488] uppercase tracking-wider mb-2 px-1">{section.title}</h3>
            <div className="bg-[#1C1C1E] rounded-xl border border-[#2A2826] overflow-hidden">
              {section.items.map(({ icon: Icon, label, desc, danger, onClick, render }) => (
                <div key={label}
                  className="px-4 py-3.5 border-b border-[#2A2826] last:border-0">
                  <div className="flex items-center gap-3">
                    <Icon size={20} className={danger ? 'text-[#D92D4A]' : 'text-[#9E9488] shrink-0'} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${danger ? 'text-[#D92D4A]' : ''}`}>{label}</p>
                      {desc && <p className="text-xs text-[#9E9488]">{desc}</p>}
                    </div>
                    {onClick && !danger && label !== 'Se déconnecter' && label !== 'Centre d\'aide' && (
                      <button type="button" onClick={onClick}
                        className="text-xs text-[#D92D4A] font-medium shrink-0">Modifier</button>
                    )}
                  </div>
                  {render?.()}
                  {danger && (
                    <button type="button" onClick={onClick} disabled={deleting}
                      className="mt-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#D92D4A]/10 text-[#D92D4A]">
                      {deleting ? 'Suppression...' : 'Supprimer mon compte'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
