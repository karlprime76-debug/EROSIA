'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, Shield, Lock, Heart, MessageCircle, AlertTriangle, User, ShieldOff, Check, Loader2, FileText } from 'lucide-react'
import { getSafetyTips, getBlockedUsers, unblockUser, revokeConsent, getSafetySummary } from '@/lib/safety/api'
import type { SafetyTip, BlockedUser, SafetySummary } from '@/lib/safety/types'

const categoryIcons: Record<string, React.ComponentType<{ className?: string; size?: number; style?: React.CSSProperties }>> = {
  dating: Heart,
  privacy: Lock,
  security: Shield,
  consent: MessageCircle,
}

const categoryColors: Record<string, string> = {
  dating: 'var(--successVibrant)',
  privacy: '#3B82F6',
  security: 'var(--warningVibrant)',
  consent: 'var(--primary)',
}

const categoryLabels: Record<string, string> = {
  dating: 'Rencontres',
  privacy: 'Confidentialité',
  security: 'Sécurité',
  consent: 'Consentement',
}

export default function SafetyPage() {
  const router = useRouter()
  const [tips, setTips] = useState<SafetyTip[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [summary, setSummary] = useState<SafetySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'tips' | 'blocks' | 'consent'>('tips')
  const [revoking, setRevoking] = useState(false)
  const [revokeDone, setRevokeDone] = useState(false)

  useEffect(() => {
    Promise.all([
      getSafetyTips(),
      getBlockedUsers(),
      getSafetySummary(),
    ]).then(([tipsRes, blocksRes, summaryRes]) => {
      if (tipsRes.data) setTips(tipsRes.data)
      if (blocksRes.data) setBlockedUsers(blocksRes.data)
      if (summaryRes.data) setSummary(summaryRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const filteredTips = useMemo(() => {
    if (activeCategory) return tips.filter(t => t.category === activeCategory)
    return tips
  }, [tips, activeCategory])

  const handleUnblock = async (userId: string) => {
    const { error } = await unblockUser(userId)
    if (!error) {
      setBlockedUsers(prev => prev.filter(b => b.blocked_id !== userId))
      return true
    }
    return false
  }

  const handleRevokeConsent = async () => {
    setRevoking(true)
    const { error } = await revokeConsent('')
    if (!error) {
      setRevokeDone(true)
      setSummary(prev => prev ? { ...prev, hasActiveConsent: false } : null)
      setTimeout(() => setRevokeDone(false), 3000)
    }
    setRevoking(false)
  }

  const categories = [...new Set(tips.map(t => t.category))]

  if (loading) {
    return (
      <div className="bg-transparent flex-1 flex flex-col">
        <Header router={router} />
        <div className="flex-1 px-4 space-y-4 pb-8 overflow-y-auto">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl bg-[var(--border)] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <Header router={router} />

      <div className="px-4 pb-8 overflow-y-auto flex-1">
        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-3 gap-2 mb-5">
            <SummaryCard icon={ShieldOff} label="Bloqués" value={summary.blockedCount} color="var(--warningVibrant)" />
            <SummaryCard icon={FileText} label="Actions" value={summary.recentConsentActions} color="#3B82F6" />
            <SummaryCard icon={Check} label="Consentement" value={summary.hasActiveConsent ? 'Actif' : 'Retiré'} color={summary.hasActiveConsent ? 'var(--successVibrant)' : 'var(--primary)'} />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1.5 mb-5 bg-[var(--surfaceElevated)] rounded-xl p-1">
          {([
            { key: 'tips', label: 'Conseils', icon: Shield },
            { key: 'blocks', label: 'Blocages', icon: ShieldOff },
            { key: 'consent', label: 'Consentement', icon: FileText },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === key ? 'bg-[var(--primary)] text-[var(--textOnPrimary)]' : 'text-[var(--textSecondary)] hover:bg-[var(--surfaceElevated)]'
              }`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'tips' && (
            <motion.div key="tips" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              {/* Category filter pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button type="button" onClick={() => setActiveCategory(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    !activeCategory ? 'bg-[var(--primary)] text-[var(--textOnPrimary)]' : 'bg-[var(--surfaceElevated)] text-[var(--textSecondary)] hover:bg-[var(--surfaceElevated)]'
                  }`}>
                  Tous
                </button>
                {categories.map(cat => {
                  const CatIcon = categoryIcons[cat]
                  return (
                    <button key={cat} type="button" onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                        activeCategory === cat ? 'text-[var(--textOnPrimary)]' : 'bg-[var(--surfaceElevated)] text-[var(--textSecondary)] hover:bg-[var(--surfaceElevated)]'
                      }`}
                      style={activeCategory === cat ? { background: categoryColors[cat] } : undefined}>
                      {CatIcon && <CatIcon className="w-3 h-3" />}
                      {categoryLabels[cat] || cat}
                    </button>
                  )
                })}
              </div>

              {filteredTips.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="w-10 h-10 text-[var(--textMuted)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--textMuted)]">Aucun conseil disponible</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTips.map((tip, i) => {
                    const color = categoryColors[tip.category] || 'var(--primary)'
                    const CatIcon = categoryIcons[tip.category]
                    return (
                      <motion.div key={tip.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-xl border p-4"
                        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: `${color}20` }}>
                            {CatIcon && <CatIcon className="w-4 h-4" style={{ color }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--textPrimary)' }}>{tip.title}</h3>
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--textSecondary)' }}>{tip.content}</p>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'blocks' && (
            <motion.div key="blocks" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              {blockedUsers.length === 0 ? (
                <div className="text-center py-12">
                  <ShieldOff className="w-10 h-10 text-[var(--textMuted)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--textMuted)]">Aucun utilisateur bloqué</p>
                  <p className="text-xs text-[var(--textMuted)] mt-1">Tu peux bloquer un utilisateur depuis la conversation.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {blockedUsers.map(bu => (
                    <div key={bu.id} className="flex items-center justify-between rounded-xl px-4 py-3"
                      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[var(--surfaceElevated)] flex items-center justify-center overflow-hidden">
                          {bu.photo ? (
                            <Image src={bu.photo} alt="" width={36} height={36} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-[var(--textMuted)]" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--textPrimary)' }}>{bu.name}</p>
                          <p className="text-xs text-[var(--textMuted)]">Bloqué le {new Date(bu.created_at).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>
                      <button type="button" onClick={async () => handleUnblock(bu.blocked_id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--surfaceElevated)] text-[var(--textSecondary)] hover:bg-[var(--surfaceElevated)] transition-all">
                        Débloquer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'consent' && (
            <motion.div key="consent" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div className="rounded-xl border p-5 mb-4 text-center"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  summary?.hasActiveConsent ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  {summary?.hasActiveConsent
                    ? <Check className="w-7 h-7 text-[var(--successVibrant)]" />
                    : <AlertTriangle className="w-7 h-7 text-[var(--errorVibrant)]" />
                  }
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--textPrimary)' }}>
                  {summary?.hasActiveConsent ? 'Consentement actif' : 'Consentement retiré'}
                </h3>
                <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--textSecondary)' }}>
                  {summary?.hasActiveConsent
                    ? 'Tu as actuellement un consentement actif pour le partage de contenu. Tu peux le retirer à tout moment.'
                    : 'Tu as retiré ton consentement. Aucun nouveau partage de contenu ne sera effectué sans ton accord explicite.'
                  }
                </p>
                {summary?.hasActiveConsent && (
                  <button type="button" onClick={handleRevokeConsent} disabled={revoking}
                    className="px-5 py-2.5 rounded-full text-xs font-semibold text-[var(--textOnPrimary)] transition-all flex items-center gap-2 mx-auto"
                    style={{ background: revoking ? 'var(--surfaceElevated)' : 'var(--primary)' }}>
                    {revoking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                    {revoking ? 'Retrait en cours...' : 'Retirer mon consentement'}
                  </button>
                )}
                {revokeDone && (
                  <p className="text-xs text-[var(--successVibrant)] mt-3">Consentement retiré avec succès.</p>
                )}
              </div>

              <h4 className="text-sm font-semibold mb-3 px-1" style={{ color: 'var(--textPrimary)' }}>
                Pourquoi retirer son consentement ?
              </h4>
              <div className="space-y-2">
                {[
                  { title: 'Tu changes d\'avis', desc: 'Le consentement peut être retiré à tout moment, sans justification.' },
                  { title: 'Tu veux plus de contrôle', desc: 'Retirer ton consentement empêche tout nouveau partage automatique.' },
                  { title: 'Fin d\'une relation', desc: 'Après une séparation, tu peux reprendre le contrôle de tes données.' },
                ].map(item => (
                  <div key={item.title} className="rounded-xl px-4 py-3"
                    style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                    <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--textPrimary)' }}>{item.title}</p>
                    <p className="text-xs" style={{ color: 'var(--textSecondary)' }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Help contact */}
        <div className="mt-6 rounded-xl p-4 text-center border border-[var(--primary)]/20" style={{ background: 'var(--card)' }}>
          <p className="text-xs mb-2" style={{ color: 'var(--textSecondary)' }}>
            Besoin d&apos;aide ? Contacte notre équipe de confiance.
          </p>
          <a href="mailto:erosiahelp@hotmail.com"
            className="text-xs font-medium text-[var(--primary)] hover:underline">
            erosiahelp@hotmail.com
          </a>
        </div>
      </div>
    </div>
  )
}

function Header({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <header className="flex items-center gap-3 px-5 pt-4 pb-3">
      <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-1"><ArrowLeft size={22} style={{ color: 'var(--textPrimary)' }} /></button>
      <h2 className="text-2xl font-bold" style={{ color: 'var(--textPrimary)' }}>Centre de sécurité</h2>
    </header>
  )
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string; size?: number; style?: React.CSSProperties }>; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl p-3 text-center border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
      <p className="text-lg font-bold" style={{ color: 'var(--textPrimary)' }}>{value}</p>
      <p className="text-[10px] text-[var(--textMuted)]">{label}</p>
    </div>
  )
}
