'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, Shield, Lock, MessageCircle, Bell, BookUser, Radar } from 'lucide-react'
import { useToast } from '@/components/Toast'
import type { PrivacySettings } from '@/lib/privacy'

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 shrink-0 ${
        checked ? 'bg-primary' : 'bg-[var(--border)]'
      }`}>
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-all duration-300 shadow-md ${
        checked ? 'translate-x-5' : ''
      }`} />
    </button>
  )
}

function SelectChip({ value, options, onChange }: {
  value: string; options: { value: string; label: string }[]; onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            value === o.value
              ? 'bg-primary/15 text-primary border border-primary/20'
              : 'bg-[var(--surfaceElevated)] text-secondary border border-[var(--border)] hover:border-muted'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface Section {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  desc: string
  content: () => React.ReactNode
}

export default function PrivacyPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [settings, setSettings] = useState<PrivacySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/privacy').then(r => r.json()).then(j => {
      if (j.settings) setSettings(j.settings)
      setLoading(false)
    }).catch(() => { setLoading(false); toast('Erreur chargement', 'error') })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const update = async (patch: Partial<PrivacySettings>) => {
    if (!settings) return
    const next = { ...settings, ...patch }
    setSettings(next)
    setSaving(true)
    try {
      const res = await fetch('/api/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const j = await res.json()
        toast(j.error || 'Erreur', 'error')
        setSettings(settings)
      }
    } catch { toast('Erreur réseau', 'error'); setSettings(settings) }
    setSaving(false)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const sections: Section[] = [
    {
      icon: Eye,
      title: 'Visibilité du profil',
      desc: 'Qui peut voir votre profil dans les découvertes',
      content: () => (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Profil visible</p>
              <p className="text-[11px] text-muted">Masque votre profil des moteurs de découverte</p>
            </div>
            <Toggle checked={settings!.profile_visible} onChange={v => update({ profile_visible: v })}
              label="Visibilité du profil" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Compatible uniquement</p>
              <p className="text-[11px] text-muted">N&rsquo;être visible que pour les personnes compatibles</p>
            </div>
            <Toggle checked={settings!.visible_to_compatible_only} onChange={v => update({ visible_to_compatible_only: v })}
              label="Compatible uniquement" />
          </div>
        </div>
      ),
    },
    {
      icon: Lock,
      title: 'Masquer mes informations',
      desc: 'Contrôle fin des données affichées',
      content: () => (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Âge exact</p>
              <p className="text-[11px] text-muted">Affiche une tranche (ex: 25-29) au lieu de l&rsquo;âge exact</p>
            </div>
            <Toggle checked={settings!.hide_exact_age} onChange={v => update({ hide_exact_age: v })}
              label="Masquer âge exact" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Distance exacte</p>
              <p className="text-[11px] text-muted">Affiche &laquo;&nbsp;Proche&nbsp;&raquo; au lieu des kilomètres exacts</p>
            </div>
            <Toggle checked={settings!.hide_exact_distance} onChange={v => update({ hide_exact_distance: v })}
              label="Masquer distance exacte" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Photos floutées</p>
              <p className="text-[11px] text-muted">Les photos restent floutées jusqu&rsquo;à votre autorisation</p>
            </div>
            <Toggle checked={settings!.blur_photos} onChange={v => update({ blur_photos: v })}
              label="Photos floutées" />
          </div>
        </div>
      ),
    },
    {
      icon: MessageCircle,
      title: 'Premier message',
      desc: 'Qui peut vous envoyer un premier message',
      content: () => (
        <SelectChip value={settings!.first_message_permission}
          options={[
            { value: 'everyone', label: 'Tout le monde' },
            { value: 'matches', label: 'Mes matchs' },
            { value: 'verified_only', label: 'Comptes vérifiés' },
            { value: 'nobody', label: 'Personne' },
          ]}
          onChange={v => update({ first_message_permission: v as PrivacySettings['first_message_permission'] })} />
      ),
    },
    {
      icon: Bell,
      title: 'Stories',
      desc: 'Qui peut voir vos stories',
      content: () => (
        <SelectChip value={settings!.story_visibility}
          options={[
            { value: 'everyone', label: 'Tout le monde' },
            { value: 'matches', label: 'Mes matchs' },
            { value: 'nobody', label: 'Personne' },
          ]}
          onChange={v => update({ story_visibility: v as PrivacySettings['story_visibility'] })} />
      ),
    },
    {
      icon: Radar,
      title: 'Statut en ligne',
      desc: 'Qui peut voir quand vous êtes en ligne',
      content: () => (
        <SelectChip value={settings!.online_status_visibility}
          options={[
            { value: 'everyone', label: 'Tout le monde' },
            { value: 'matches', label: 'Mes matchs' },
            { value: 'nobody', label: 'Personne' },
          ]}
          onChange={v => update({ online_status_visibility: v as PrivacySettings['online_status_visibility'] })} />
      ),
    },
    {
      icon: BookUser,
      title: 'Confirmations de lecture',
      desc: 'Afficher les accusés de lecture dans les messages',
      content: () => (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Lectures visibles</p>
            <p className="text-[11px] text-muted">Les autres verront si vous avez lu leurs messages</p>
          </div>
          <Toggle checked={settings!.read_receipts} onChange={v => update({ read_receipts: v })}
            label="Confirmations de lecture" />
        </div>
      ),
    },
    {
      icon: Shield,
      title: 'Sécurité automatique',
      desc: 'Protection proactive contre les abus',
      content: () => (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Bloquer automatiquement</p>
            <p className="text-[11px] text-muted">Bloque automatiquement les comptes signalés par la communauté</p>
          </div>
          <Toggle checked={settings!.auto_block_reported} onChange={v => update({ auto_block_reported: v })}
            label="Blocage automatique" />
        </div>
      ),
    },
  ]

  return (
    <div className="flex-1 flex flex-col bg-transparent min-h-screen">
      <h1 className="sr-only">Confidentialité</h1>
      <header className="flex items-center gap-3 px-3 py-3 border-b border-[var(--border)]/50 bg-[var(--bg)]/80 backdrop-blur-xl z-10 sticky top-0">
        <button onClick={() => router.back()} aria-label="Retour" className="p-2 -ml-1 rounded-xl hover:bg-[var(--surfaceElevated)] transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="font-semibold text-base">Confidentialité</h2>
        </div>
        {saving && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {sections.map(({ icon: Icon, title, desc, content }) => (
          <div key={title} className="rounded-2xl p-4 border transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(217,45,74,0.04) 0%, rgba(255,255,255,0.01) 100%)',
              borderColor: 'rgba(255,255,255,0.06)',
            }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl shrink-0"
                style={{ background: 'linear-gradient(135deg, rgba(217,45,74,0.12) 0%, rgba(217,45,74,0.04) 100%)' }}>
                <Icon size={16} className="text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="text-[11px] text-muted">{desc}</p>
              </div>
            </div>
            <div className="pl-11">
              {content()}
            </div>
          </div>
        ))}

        <p className="text-[10px] text-muted text-center pt-2 pb-8">
          Vos paramètres de confidentialité sont appliqués en temps réel.
        </p>
      </div>
    </div>
  )
}
