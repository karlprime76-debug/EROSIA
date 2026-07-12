'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Heart, MessageCircle, CalendarDays, Eye, Gift, Zap, Trophy } from 'lucide-react'

interface UserStats {
  total_swipes: number
  total_matches: number
  total_messages_sent: number
  total_dates: number
  total_stories: number
  total_gifts_sent: number
  total_gifts_received: number
  profile_views: number
  daily_likes_received: number
  weekly_likes_received: number
  response_rate: number
  avg_response_time_min: number
  current_streak: number
  longest_streak: number
}

interface LevelData {
  level: number
  xp: number
  xp_to_next: number
  total_xp: number
  title?: string
  badge?: string
}

const statCards = [
  { key: 'total_matches', icon: Heart, label: 'Matchs', color: 'text-red-400', bg: 'bg-red-500/10' },
  { key: 'total_messages_sent', icon: MessageCircle, label: 'Messages', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'total_dates', icon: CalendarDays, label: 'Rendez-vous', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'profile_views', icon: Eye, label: 'Vues profil', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { key: 'total_gifts_received', icon: Gift, label: 'Cadeaux reçus', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { key: 'current_streak', icon: Zap, label: 'Jours consécutifs', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { key: 'total_swipes', icon: BarChart3, label: 'Swipes', color: 'text-sky-400', bg: 'bg-sky-500/10' },
  { key: 'total_stories', icon: Trophy, label: 'Stories', color: 'text-pink-400', bg: 'bg-pink-500/10' },
]

function StatCard({ icon: Icon, label, value, color, bg }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; color: string; bg: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/10 bg-primary/5">
      <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export default function StatsPage() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [level, setLevel] = useState<LevelData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then(r => r.json()),
      fetch('/api/levels').then(r => r.json()),
    ]).then(([s, l]) => {
      if (s && !s.error) setStats(s)
      if (l && !l.error) setLevel(l)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background pb-24">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-primary/5 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background pb-24">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Mes statistiques
        </h1>

        {level && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-3xl font-bold">Niveau {level.level}</p>
                {level.title && <p className="text-sm text-muted-foreground">{level.title}</p>}
              </div>
              {level.badge && <span className="text-4xl">{level.badge}</span>}
            </div>
            <div className="w-full h-3 rounded-full bg-primary/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${Math.min(100, level.xp_to_next ? (level.xp / level.xp_to_next) * 100 : 0)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{level.xp} / {level.xp_to_next} XP</p>
            <p className="text-xs text-muted-foreground">Total: {level.total_xp} XP</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {statCards.map(s => (
            <StatCard
              key={s.key}
              icon={s.icon}
              label={s.label}
              value={stats?.[s.key as keyof UserStats] ?? 0}
              color={s.color}
              bg={s.bg}
            />
          ))}
        </div>

        {stats && (
          <div className="p-5 rounded-2xl border border-primary/10 bg-primary/5 space-y-3">
            <h2 className="font-semibold">Engagement</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Taux de réponse</p>
                <p className="text-lg font-bold">{stats.response_rate ?? 0}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Temps de réponse moyen</p>
                <p className="text-lg font-bold">{stats.avg_response_time_min ?? 0} min</p>
              </div>
              <div>
                <p className="text-muted-foreground">Likes (24h)</p>
                <p className="text-lg font-bold">{stats.daily_likes_received ?? 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Likes (7j)</p>
                <p className="text-lg font-bold">{stats.weekly_likes_received ?? 0}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
