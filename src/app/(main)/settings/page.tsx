'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Eye, EyeOff, Trash2, Shield as ShieldIcon, Crown, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { getSubscriptionStatus, createCheckoutSession, getTravelMode, setTravelMode, getGhostMode, setGhostMode as setGhostModeApi } from '@/lib/api'
import ToggleSwitch from '@/components/ToggleSwitch'

export default function SettingsPage() {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [visibility, setVisibility] = useState('all')
  const [notifPush, setNotifPush] = useState(true)
  const [notifEmail, setNotifEmail] = useState(true)
  const [subscriptionTier, setSubscriptionTier] = useState('free')
  const [travelActive, setTravelActive] = useState(false)
  const [travelCity, setTravelCity] = useState('')
  const [ghostMode, setGhostMode] = useState(false)

  useEffect(() => {
    supabase.from('profiles').select('looking_for').eq('id', supabase.auth.getUser().then(({ data }) => data.user?.id)).single()
      .then(() => {}) // placeholder — we could store prefs in profile later
    getSubscriptionStatus().then(r => setSubscriptionTier(r.tier))
    getTravelMode().then(mode => {
      setTravelActive(mode.active)
      setTravelCity(mode.city ?? '')
    })
    getGhostMode().then(setGhostMode)
  }, [])

  const handleDelete = async () => {
    if (!confirm('Supprimer définitivement ton compte ? Cette action est irréversible.')) return
    setDeleting(true)
    try {
      await supabase.from('profiles').delete().eq('id', (await supabase.auth.getUser()).data.user?.id)
      await fetch('/api/auth/delete-account', { method: 'POST' })
      await supabase.auth.signOut()
      router.push('/')
    } catch {
      await supabase.auth.signOut()
      router.push('/')
    }
  }

  const handleUpgrade = async () => {
    const { url } = await createCheckoutSession()
    if (url) window.location.href = url
  }

  const handleTravelToggle = async (v: boolean) => {
    setTravelActive(v)
    await setTravelMode(travelCity, v)
  }

  const handleGhostToggle = async (v: boolean) => {
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
                <button key={o.value} onClick={() => setVisibility(o.value)}
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
                <button onClick={() => setNotifPush(!notifPush)}
                  className={`w-10 h-5 rounded-full transition relative ${notifPush ? 'bg-[#D92D4A]' : 'bg-[#262628]'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition ${notifPush ? 'left-5' : 'left-0.5'}`} />
                </button>
              </label>
              <label className="flex items-center justify-between">
                <span className="text-xs text-[#9E9488]">Email</span>
                <button onClick={() => setNotifEmail(!notifEmail)}
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
            <ToggleSwitch enabled={ghostMode} onChange={handleGhostToggle} />
          ),
        },
      ],
    },
    {
      title: 'Compte',
      items: [
        {
          icon: ShieldIcon, label: 'Centre d\'aide',
          onClick: () => window.open('mailto:support@erosia.app', '_blank'),
          desc: 'support@erosia.app',
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
          icon: Crown, label: 'Erosia Premium',
          desc: subscriptionTier === 'premium' ? 'Actif' : 'Gratuit',
          render: () => (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${subscriptionTier === 'premium' ? 'bg-[#22C55E]' : 'bg-[#6B6258]'}`} />
                <span className="text-xs text-[#9E9488]">{subscriptionTier === 'premium' ? 'Premium actif' : 'Compte gratuit'}</span>
              </div>
              {subscriptionTier !== 'premium' && (
                <button onClick={handleUpgrade}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-white"
                  style={{ background: 'linear-gradient(135deg, #D92D4A, #C85A17)' }}>
                  Passer à Premium
                </button>
              )}
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
                <ToggleSwitch enabled={travelActive} onChange={handleTravelToggle} />
              </label>
              {travelActive && (
                <input value={travelCity} onChange={e => setTravelCity(e.target.value)} onBlur={saveTravelCity}
                  placeholder="Nom de la ville..."
                  className="w-full px-3 py-2 rounded-lg bg-[#262628] text-sm text-white border border-[#2A2826] outline-none focus:border-[#D92D4A]"
                />
              )}
            </div>
          ),
        },
      ],
    },
  ]

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button onClick={() => router.back()} className="p-1"><ArrowLeft size={22} /></button>
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
                    <Icon size={20} className={danger ? 'text-[#D92D4A]' : 'text-[#6B6258] shrink-0'} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${danger ? 'text-[#D92D4A]' : ''}`}>{label}</p>
                      {desc && <p className="text-xs text-[#6B6258]">{desc}</p>}
                    </div>
                    {onClick && !danger && (
                      <button onClick={onClick}
                        className="text-xs text-[#D92D4A] font-medium shrink-0">Modifier</button>
                    )}
                  </div>
                  {render?.()}
                  {danger && (
                    <button onClick={onClick} disabled={deleting}
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
