'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { getModerationQueue, reviewContent } from '@/lib/api'
import {
  LayoutDashboard, Users as UsersIcon, Flag, Shield, BadgeCheck,
  Crown, Wrench, Smartphone, Activity, Menu, X,
  Search, ChevronLeft, ChevronRight,
  RefreshCw, LogOut, Download, CheckCircle, XCircle,
  AlertTriangle, Ban, UserX, Filter,
} from 'lucide-react'
import { useToast } from '@/components/Toast'

const TABS = [
  { key: 'apercu', label: 'Aperçu', icon: LayoutDashboard },
  { key: 'utilisateurs', label: 'Utilisateurs', icon: UsersIcon },
  { key: 'signalements', label: 'Signalements', icon: Flag },
  { key: 'moderation', label: 'Modération', icon: Shield },
  { key: 'verifications', label: 'Vérifications', icon: BadgeCheck },
  { key: 'premium', label: 'Premium', icon: Crown },
  { key: 'maintenance', label: 'Maintenance', icon: Wrench },
  { key: 'retraits', label: 'Retraits', icon: Smartphone },
  { key: 'logs', label: 'Logs', icon: Activity },
] as const

type Tab = typeof TABS[number]['key']

interface Stats {
  newUsers24h: number; activeUsers7d: number; onlineNow: number
  matchesCreated24h: number; activeConversations: number
  storiesPosted24h: number; eventsCreated24h: number
  reportsPending: number; verificationsPending: number
  premiumSubs: number; revenueMonth: number; retentionRate: number
  totalUsers: number
  userGrowth: Array<{ date: string; count: number }>
  dailyActive: Array<{ date: string; count: number }>
}

interface UserRow {
  id: string; name: string; email: string; age: number; location: string
  photos: string[]; is_verified: boolean; verification_status: string
  is_suspended: boolean; is_banned: boolean; warning_count: number
  subscription_tier: string; subscription_end: string; created_at: string; is_admin: boolean
}

interface ReportRow {
  id: string; reporter_id: string; reported_id: string; category: string
  description: string; content_type: string; status: string; created_at: string
  reporter: { id: string; name: string; email: string }
  reported: { id: string; name: string; email: string }
}

interface PayoutTx {
  id: string; user_id: string; user_name: string; amount_cents: number
  payment_details: string; status: string; created_at: string
}

interface VerificationReq {
  id: string; user_id: string; photo_url: string; status: string; created_at: string
  profile?: { name: string; photos: string[] }
}

interface ModerationItem {
  id: string; content_type: string; content_id: string; content_text?: string
  status?: string; reviewed: boolean; created_at: string; user_id?: string
}

interface MaintenanceData {
  maintenance: { id: string; active: boolean; message: string; estimated_duration: string; updated_at: string }
  logs: Array<{ id: string; action: string; message: string; admin: { name: string }; created_at: string }>
}

interface ActivityLog {
  id: string; admin_id: string; action: string; target_type: string
  target_id: string; details: Record<string, unknown>; created_at: string
  admin: { id: string; name: string; email: string }
}

function formatCFA(cents: number): string {
  return `${(cents / 100).toLocaleString('fr-FR')} F CFA`
}

function StatCard({ icon: Icon, label, value, trend, color }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string; value: string | number; trend?: number; color?: string
}) {
  return (
    <div className="glass-card rounded-2xl p-4 flex items-start gap-3">
      <div className={`p-2.5 rounded-xl ${color ?? 'bg-primary/10'}`}>
        <Icon size={20} className={color ? 'text-[var(--' + color.replace('bg-', '') + ')]' : 'text-primary'} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-bold truncate">{value}</p>
        <p className="text-[10px] text-secondary whitespace-nowrap">{label}</p>
        {trend !== undefined && (
          <p className={`text-[10px] mt-0.5 ${trend >= 0 ? 'text-success' : 'text-error'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </p>
        )}
      </div>
    </div>
  )
}

function LineChart({ data, height = 120, color = 'var(--primary)' }: {
  data: Array<{ date: string; count: number }>
  height?: number; color?: string
}) {
  if (data.length === 0) return null
  const max = Math.max(...data.map(d => d.count), 1)
  const width = data.length * 40
  const points = data.map((d, i) => {
    const x = i * 40 + 20
    const y = height - (d.count / max) * (height - 20) - 10
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="relative" style={{ height }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          points={points} />
        {data.map((d, i) => {
          const x = i * 40 + 20
          const y = height - (d.count / max) * (height - 20) - 10
          return <circle key={i} cx={x} cy={y} r="3" fill={color} />
        })}
      </svg>
      <div className="flex justify-between mt-1 px-1">
        {data.map((d, i) => (
          <span key={i} className="text-[8px] text-secondary">{d.date.split(' ')[0]}</span>
        ))}
      </div>
    </div>
  )
}

function BarChart({ data, height = 120, color = 'var(--primary)' }: {
  data: Array<{ date: string; count: number }>
  height?: number; color?: string
}) {
  if (data.length === 0) return null
  const max = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="relative" style={{ height: height + 20 }}>
      <div className="flex items-end justify-around h-full gap-1 px-1">
        {data.map((d, i) => {
          const barH = (d.count / max) * height
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-[9px] font-medium">{d.count}</span>
              <div className="w-full rounded-t-md transition-all duration-300"
                style={{ height: Math.max(barH, 2), backgroundColor: color, borderRadius: '4px 4px 0 0' }} />
              <span className="text-[8px] text-secondary">{d.date.split(' ')[0]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ConfirmDialog({ open, title, message, onConfirm, onCancel }: {
  open: boolean; title: string; message: string
  onConfirm: () => void; onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onCancel}>
      <div className="glass-card rounded-3xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm text-secondary mb-6">{message}</p>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 rounded-full text-sm font-medium bg-surface-elevated text-secondary">Annuler</button>
          <button type="button" onClick={onConfirm}
            className="flex-1 py-2.5 rounded-full text-sm font-medium bg-primary text-on-primary">Confirmer</button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [userEmail, setUserEmail] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)
  const [tab, setTab] = useState<Tab>('apercu')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersPage, setUsersPage] = useState(1)
  const [usersTotalPages, setUsersTotalPages] = useState(1)
  const [userSearch, setUserSearch] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState('all')
  const [userVerifFilter, setUserVerifFilter] = useState('all')
  const [userPremiumFilter, setUserPremiumFilter] = useState('all')
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const userSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [reports, setReports] = useState<ReportRow[]>([])
  const [reportsPage, setReportsPage] = useState(1)
  const [reportsTotalPages, setReportsTotalPages] = useState(1)
  const [reportsCategory, setReportsCategory] = useState('all')
  const [reportsStatus, setReportsStatus] = useState('all')
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set())

  const [modQueue, setModQueue] = useState<ModerationItem[]>([])
  const [verifications, setVerifications] = useState<VerificationReq[]>([])

  const [payouts, setPayouts] = useState<PayoutTx[]>([])
  const [payoutsLoading, setPayoutsLoading] = useState(false)
  const [adminActionLoading, setAdminActionLoading] = useState(false)

  const [maintenance, setMaintenance] = useState<MaintenanceData | null>(null)
  const [maintenanceActive, setMaintenanceActive] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [maintenanceDuration, setMaintenanceDuration] = useState('')

  const [premiumUsers, setPremiumUsers] = useState<UserRow[]>([])
  const [grantUserId, setGrantUserId] = useState('')
  const [grantPlan, setGrantPlan] = useState<'premium_monthly' | 'premium_yearly'>('premium_monthly')

  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [logsPage, setLogsPage] = useState(1)
  const [logsTotalPages, setLogsTotalPages] = useState(1)
  const [logActionFilter, setLogActionFilter] = useState('all')
  const [logActionTypes, setLogActionTypes] = useState<string[]>([])

  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)

  async function loadStats() {
    const res = await fetch('/api/admin/stats')
    if (res.ok) {
      const data = await res.json()
      setStats(data)
    }
  }

  async function loadUsers() {
    const params = new URLSearchParams({ page: String(usersPage), limit: '20' })
    if (userSearch) params.set('search', userSearch)
    if (userStatusFilter !== 'all') params.set('status', userStatusFilter)
    if (userVerifFilter !== 'all') params.set('verification', userVerifFilter)
    if (userPremiumFilter !== 'all') params.set('premium', userPremiumFilter)
    const res = await fetch(`/api/admin/users?${params}`)
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users)
      setUsersTotalPages(data.totalPages)
    }
  }

  async function loadReports() {
    const params = new URLSearchParams({ page: String(reportsPage), limit: '20' })
    if (reportsCategory !== 'all') params.set('category', reportsCategory)
    if (reportsStatus !== 'all') params.set('status', reportsStatus)
    const res = await fetch(`/api/admin/reports?${params}`)
    if (res.ok) {
      const data = await res.json()
      setReports(data.reports)
      setReportsTotalPages(data.totalPages)
    }
  }

  async function loadModeration() {
    const { data: mData } = await getModerationQueue()
    if (mData) setModQueue(mData as ModerationItem[])
  }

  async function loadVerifications() {
    const { data: vData } = await supabase
      .from('verification_requests')
      .select('*, profile:profiles!verification_requests_user_id_fkey(id, name, photos)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (vData) setVerifications(vData as unknown as VerificationReq[])
  }

  async function loadPayouts() {
    setPayoutsLoading(true)
    const res = await fetch('/api/admin')
    if (res.ok) {
      const data = await res.json()
      setPayouts(data.payouts ?? [])
    }
    setPayoutsLoading(false)
  }

  async function loadMaintenance() {
    const res = await fetch('/api/admin/maintenance')
    if (res.ok) {
      const data = await res.json()
      setMaintenance(data)
      setMaintenanceActive(data.maintenance.active)
      setMaintenanceMessage(data.maintenance.message ?? '')
      setMaintenanceDuration(data.maintenance.estimated_duration ?? '')
    }
  }

  async function loadPremium() {
    const res = await fetch('/api/admin/users?premium=premium&limit=50')
    if (res.ok) {
      const data = await res.json()
      setPremiumUsers(data.users)
    }
  }

  async function loadLogs() {
    const params = new URLSearchParams({ page: String(logsPage), limit: '30' })
    if (logActionFilter !== 'all') params.set('action', logActionFilter)
    const res = await fetch(`/api/admin/activity?${params}`)
    if (res.ok) {
      const data = await res.json()
      setLogs(data.logs)
      setLogsTotalPages(data.totalPages)
      if (data.actionTypes) setLogActionTypes(data.actionTypes)
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setChecking(false); return }
      setUserEmail(user.email ?? '')
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
      if (data?.is_admin) {
        setIsAdmin(true)
        Promise.all([
          loadStats(), loadUsers(), loadReports(),
          loadModeration(), loadVerifications(), loadPayouts(),
          loadMaintenance(), loadPremium(), loadLogs(),
        ])
      }
      setChecking(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearchChange = (val: string) => {
    setUserSearch(val)
    if (userSearchTimer.current) clearTimeout(userSearchTimer.current)
    userSearchTimer.current = setTimeout(() => setUsersPage(1), 400)
  }

  const handleVerify = async (reqId: string, userId: string, approved: boolean) => {
    if (adminActionLoading) return
    setAdminActionLoading(true)
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: reqId, userId, approved }),
    })
    setAdminActionLoading(false)
    if (!res.ok) { const d = await res.json(); return toast(d.error, 'error') }
    setVerifications(v => v.filter(r => r.id !== reqId))
    toast(approved ? 'Vérification approuvée' : 'Vérification refusée', 'success')
  }

  const handleModeration = async (id: string, approved: boolean) => {
    if (adminActionLoading) return
    setAdminActionLoading(true)
    await reviewContent(id, approved)
    setModQueue(m => m.filter(i => i.id !== id))
    setAdminActionLoading(false)
  }

  const handlePayoutAction = async (txId: string, status: 'completed' | 'failed') => {
    if (adminActionLoading) return
    setAdminActionLoading(true)
    const res = await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txId, status }),
    })
    setAdminActionLoading(false)
    if (!res.ok) { const d = await res.json(); toast(d.error, 'error'); return }
    setPayouts(p => p.filter(tx => tx.id !== txId))
    toast(status === 'completed' ? 'Retrait marqué effectué' : 'Retrait marqué échoué', 'success')
  }

  const handleUserAction = async (userId: string, action: 'suspend' | 'ban' | 'warn', reason?: string) => {
    if (adminActionLoading) return
    setAdminActionLoading(true)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _action: action, userId, reason }),
    })
    setAdminActionLoading(false)
    if (!res.ok) { const d = await res.json(); toast(d.error, 'error'); return }
    toast(`Utilisateur ${action === 'ban' ? 'banni' : action === 'suspend' ? 'suspendu' : 'averti'}`, 'success')
    loadUsers()
  }

  const handleReportAction = async (reportId: string, status: 'dismissed' | 'action_taken', actionUserId?: string, actionType?: 'warn' | 'suspend' | 'ban') => {
    const res = await fetch('/api/admin/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, status, actionUserId, actionType }),
    })
    if (!res.ok) { const d = await res.json(); toast(d.error, 'error'); return }
    toast(status === 'dismissed' ? 'Signalement ignoré' : 'Action effectuée', 'success')
    loadReports()
  }

  const handleBulkReportAction = async (status: 'dismissed' | 'action_taken') => {
    for (const id of selectedReports) {
      await handleReportAction(id, status)
    }
    setSelectedReports(new Set())
  }

  const handleMaintenanceToggle = async () => {
    if (adminActionLoading) return
    setAdminActionLoading(true)
    const res = await fetch('/api/admin/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !maintenanceActive, message: maintenanceMessage, estimated_duration: maintenanceDuration }),
    })
    setAdminActionLoading(false)
    if (!res.ok) { const d = await res.json(); toast(d.error, 'error'); return }
    setMaintenanceActive(!maintenanceActive)
    toast(maintenanceActive ? 'Maintenance désactivée' : 'Maintenance activée', 'success')
    loadMaintenance()
  }

  const handlePremiumGrant = async () => {
    if (adminActionLoading) return
    if (!grantUserId) return toast('ID utilisateur requis', 'error')
    setAdminActionLoading(true)
    const res = await fetch('/api/admin/premium', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _action: 'grant', userId: grantUserId, plan: grantPlan }),
    })
    setAdminActionLoading(false)
    if (!res.ok) { const d = await res.json(); toast(d.error, 'error'); return }
    toast('Premium accordé', 'success')
    setGrantUserId('')
    loadPremium()
    loadStats()
  }

  const handlePremiumRevoke = async (userId: string) => {
    if (adminActionLoading) return
    setAdminActionLoading(true)
    const res = await fetch('/api/admin/premium', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _action: 'revoke', userId }),
    })
    setAdminActionLoading(false)
    if (!res.ok) { const d = await res.json(); toast(d.error, 'error'); return }
    toast('Premium révoqué', 'success')
    loadPremium()
    loadStats()
  }

  const handleExportCSV = () => {
    window.open('/api/admin?format=csv', '_blank')
    toast('Export CSV démarré', 'success')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
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

  const navItems = TABS.map(t => ({
    ...t,
    badge: t.key === 'verifications' ? verifications.length : t.key === 'moderation' ? modQueue.length : t.key === 'signalements' ? stats?.reportsPending ?? 0 : t.key === 'retraits' ? payouts.length : 0,
  }))

  return (
    <div className="min-h-dvh bg-transparent flex">
      {confirmDialog && (
        <ConfirmDialog
          open
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={() => { confirmDialog.onConfirm(); setConfirmDialog(null) }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-surface border-r border-border transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>
        <div className="p-4 flex items-center justify-between border-b border-border">
          <h2 className="text-lg font-bold">Erosia Admin</h2>
          <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Fermer le menu" className="p-2.5 text-secondary hover:text-theme transition lg:hidden">
            <X size={18} />
          </button>
        </div>
        <nav className="p-2 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {navItems.map(t => {
            const Icon = t.icon
            return (
              <button key={t.key} type="button" onClick={() => { setTab(t.key); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${tab === t.key ? 'bg-primary text-on-primary' : 'text-secondary hover:bg-surface-elevated'}`}>
                <Icon size={18} />
                <span className="flex-1 text-left">{t.label}</span>
                {t.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--error)] text-white">{t.badge}</span>
                )}
              </button>
            )
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <p className="text-[10px] text-secondary truncate mb-2">{userEmail}</p>
          <button type="button" onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary hover:bg-surface-elevated transition">
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="flex-1 min-w-0 pb-20 lg:pb-0">
        <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu" className="p-2.5 text-secondary hover:text-theme transition lg:hidden">
                <Menu size={20} />
              </button>
              <h1 className="text-lg font-bold">{TABS.find(t => t.key === tab)?.label}</h1>
            </div>
            <button type="button" onClick={() => {
              setLoading(true)
              Promise.all([loadStats(), loadUsers(), loadReports(), loadModeration(), loadVerifications(), loadPayouts(), loadMaintenance(), loadPremium(), loadLogs()])
                .finally(() => setLoading(false))
            }} className="p-2.5 text-secondary hover:text-theme transition" aria-label="Rafraîchir">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        <div className="p-4 max-w-6xl mx-auto space-y-6">
          {tab === 'apercu' && stats && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <StatCard icon={UsersIcon} label="Nouveaux (24h)" value={stats.newUsers24h} />
                <StatCard icon={UsersIcon} label="Actifs (7j)" value={stats.activeUsers7d} />
                <StatCard icon={UsersIcon} label="En ligne" value={stats.onlineNow} />
                <StatCard icon={LayoutDashboard} label="Matchs (24h)" value={stats.matchesCreated24h} />
                <StatCard icon={LayoutDashboard} label="Conversations" value={stats.activeConversations} />
                <StatCard icon={LayoutDashboard} label="Stories (24h)" value={stats.storiesPosted24h} />
                <StatCard icon={LayoutDashboard} label="Événements (24h)" value={stats.eventsCreated24h} />
                <StatCard icon={Flag} label="Signalements" value={stats.reportsPending} color="bg-errorBg" />
                <StatCard icon={BadgeCheck} label="Vérifications" value={stats.verificationsPending} />
                <StatCard icon={Crown} label="Premium" value={stats.premiumSubs} />
                <StatCard icon={Smartphone} label="Revenu (mois)" value={formatCFA(stats.revenueMonth)} />
                <StatCard icon={Activity} label="Rétention" value={`${stats.retentionRate}%`} trend={stats.retentionRate - 50} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-card rounded-2xl p-4">
                  <h3 className="text-sm font-semibold mb-3">Inscriptions (7 jours)</h3>
                  <LineChart data={stats.userGrowth} />
                </div>
                <div className="glass-card rounded-2xl p-4">
                  <h3 className="text-sm font-semibold mb-3">Utilisateurs actifs (7 jours)</h3>
                  <BarChart data={stats.dailyActive} />
                </div>
              </div>
            </>
          )}

          {tab === 'utilisateurs' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                  <input type="text" placeholder="Rechercher par nom ou email..." value={userSearch}
                    onChange={e => handleSearchChange(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-full text-sm bg-surface-elevated border-none outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <select value={userStatusFilter} onChange={e => { setUserStatusFilter(e.target.value); setUsersPage(1) }}
                  className="px-3 py-2.5 rounded-full text-sm bg-surface-elevated border-none outline-none">
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actifs</option>
                  <option value="suspended">Suspendus</option>
                  <option value="banned">Bannis</option>
                </select>
                <select value={userVerifFilter} onChange={e => { setUserVerifFilter(e.target.value); setUsersPage(1) }}
                  className="px-3 py-2.5 rounded-full text-sm bg-surface-elevated border-none outline-none">
                  <option value="all">Vérification: Tous</option>
                  <option value="verified">Vérifiés</option>
                  <option value="unverified">Non vérifiés</option>
                </select>
                <select value={userPremiumFilter} onChange={e => { setUserPremiumFilter(e.target.value); setUsersPage(1) }}
                  className="px-3 py-2.5 rounded-full text-sm bg-surface-elevated border-none outline-none">
                  <option value="all">Abonnement: Tous</option>
                  <option value="premium">Premium</option>
                  <option value="free">Gratuit</option>
                </select>
                <button type="button" onClick={handleExportCSV}
                  className="px-4 py-2.5 rounded-full text-sm font-medium bg-surface-elevated text-secondary hover:bg-surface-border transition flex items-center gap-2">
                  <Download size={14} /> CSV
                </button>
              </div>

              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 text-xs text-secondary font-medium">Nom</th>
                        <th className="text-left p-3 text-xs text-secondary font-medium">Email</th>
                        <th className="text-left p-3 text-xs text-secondary font-medium">Âge</th>
                        <th className="text-left p-3 text-xs text-secondary font-medium">Localisation</th>
                        <th className="text-left p-3 text-xs text-secondary font-medium">Statut</th>
                        <th className="text-left p-3 text-xs text-secondary font-medium">Vérif.</th>
                        <th className="text-left p-3 text-xs text-secondary font-medium">Abonnement</th>
                        <th className="text-left p-3 text-xs text-secondary font-medium">Inscription</th>
                        <th className="text-left p-3 text-xs text-secondary font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <>
                          <tr key={u.id} className="border-b border-border/50 hover:bg-surface-elevated/50 cursor-pointer"
                            onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}>
                            <td className="p-3 font-medium">{u.name ?? '—'}</td>
                            <td className="p-3 text-secondary">{u.email ?? '—'}</td>
                            <td className="p-3">{u.age ?? '—'}</td>
                            <td className="p-3 text-secondary">{u.location ?? '—'}</td>
                            <td className="p-3">
                              {u.is_banned ? <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-errorBg text-error">Banni</span>
                                : u.is_suspended ? <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-warningBg text-warning">Suspendu</span>
                                : <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-successBg text-success">Actif</span>}
                            </td>
                            <td className="p-3">
                              {u.is_verified ? <BadgeCheck size={16} className="text-primary" /> : <span className="text-secondary text-xs">Non</span>}
                            </td>
                            <td className="p-3">
                              {u.subscription_tier === 'premium' ? <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">Premium</span>
                                : <span className="text-secondary text-xs">—</span>}
                            </td>
                            <td className="p-3 text-secondary text-xs">{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={e => { e.stopPropagation(); handleUserAction(u.id, 'warn', 'Avertissement administratif') }} disabled={adminActionLoading}
                                  className="p-2.5 text-warning hover:bg-warningBg rounded-lg transition disabled:opacity-40" aria-label="Avertir"><AlertTriangle size={14} /></button>
                                <button type="button" onClick={e => { e.stopPropagation(); setConfirmDialog({ title: 'Suspendre', message: `Suspendre ${u.name} ?`, onConfirm: () => handleUserAction(u.id, 'suspend', 'Suspension administrative') }) }} disabled={adminActionLoading}
                                  className="p-2.5 text-error hover:bg-errorBg rounded-lg transition disabled:opacity-40" aria-label="Suspendre"><UserX size={14} /></button>
                                <button type="button" onClick={e => { e.stopPropagation(); setConfirmDialog({ title: 'Bannir', message: `Bannir ${u.name} ?`, onConfirm: () => handleUserAction(u.id, 'ban', 'Bannissement administratif') }) }} disabled={adminActionLoading}
                                  className="p-2.5 text-error hover:bg-errorBg rounded-lg transition disabled:opacity-40" aria-label="Bannir"><Ban size={14} /></button>
                              </div>
                            </td>
                          </tr>
                          {expandedUser === u.id && (
                            <tr key={`${u.id}-detail`}>
                              <td colSpan={9} className="p-4 bg-surface-elevated/30">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                  <div><p className="text-[10px] text-secondary">ID</p><p className="font-mono text-xs">{u.id}</p></div>
                                  <div><p className="text-[10px] text-secondary">Avertissements</p><p>{u.warning_count}</p></div>
                                  <div><p className="text-[10px] text-secondary">Photos</p><p>{u.photos?.length ?? 0}</p></div>
                                  <div><p className="text-[10px] text-secondary">Admin</p><p>{u.is_admin ? 'Oui' : 'Non'}</p></div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                      {users.length === 0 && (
                        <tr><td colSpan={9} className="p-8 text-center text-secondary text-sm">Aucun utilisateur trouvé</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {usersTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button type="button" disabled={usersPage <= 1} onClick={() => setUsersPage(p => p - 1)} aria-label="Page précédente"
                    className="p-2.5 rounded-full bg-surface-elevated text-secondary disabled:opacity-30"><ChevronLeft size={16} /></button>
                  <span className="text-sm text-secondary">{usersPage} / {usersTotalPages}</span>
                  <button type="button" disabled={usersPage >= usersTotalPages} onClick={() => setUsersPage(p => p + 1)} aria-label="Page suivante"
                    className="p-2.5 rounded-full bg-surface-elevated text-secondary disabled:opacity-30"><ChevronRight size={16} /></button>
                </div>
              )}
            </div>
          )}

          {tab === 'signalements' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <select value={reportsCategory} onChange={e => { setReportsCategory(e.target.value); setReportsPage(1) }}
                  className="px-3 py-2.5 rounded-full text-sm bg-surface-elevated border-none outline-none">
                  <option value="all">Toutes catégories</option>
                  <option value="spam">Spam</option>
                  <option value="insulte">Insulte</option>
                  <option value="harcelement">Harcèlement</option>
                  <option value="faux_profil">Faux profil</option>
                  <option value="contenu_inapproprie">Contenu inapproprié</option>
                  <option value="compte_multiple">Compte multiple</option>
<option value="demande_argent">Demande d&apos;argent</option>
<option value="usurpation_identite">Usurpation d&apos;identité</option>
                  <option value="contenu_violent">Contenu violent</option>
                  <option value="autre">Autre</option>
                </select>
                <select value={reportsStatus} onChange={e => { setReportsStatus(e.target.value); setReportsPage(1) }}
                  className="px-3 py-2.5 rounded-full text-sm bg-surface-elevated border-none outline-none">
                  <option value="all">Tous statuts</option>
                  <option value="pending">En attente</option>
                  <option value="reviewed">Examiné</option>
                  <option value="dismissed">Ignoré</option>
                  <option value="action_taken">Action prise</option>
                </select>
                {selectedReports.size > 0 && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => handleBulkReportAction('dismissed')}
                      className="px-4 py-2.5 rounded-full text-xs font-medium bg-surface-elevated text-secondary">Ignorer ({selectedReports.size})</button>
                  </div>
                )}
              </div>

              {reports.map(r => (
                <div key={r.id} className={`glass-card rounded-2xl p-4 ${r.status === 'pending' ? 'ring-1 ring-error/30' : ''}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={selectedReports.has(r.id)} onChange={() => {
                      setSelectedReports(prev => {
                        const next = new Set(prev)
                        if (next.has(r.id)) next.delete(r.id); else next.add(r.id)
                        return next
                      })
                    }} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-errorBg text-error">{r.category}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          r.status === 'pending' ? 'bg-warningBg text-warning' : r.status === 'dismissed' ? 'bg-surface-elevated text-secondary' : 'bg-successBg text-success'
                        }`}>{r.status}</span>
                      </div>
                      <p className="text-sm"><strong>Signaleur:</strong> {r.reporter?.name ?? 'Inconnu'}</p>
                      <p className="text-sm"><strong>Signalé:</strong> {r.reported?.name ?? 'Inconnu'}</p>
                      {r.description && <p className="text-sm text-secondary mt-1">{r.description}</p>}
                      <p className="text-[10px] text-secondary mt-1">{new Date(r.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex flex-wrap gap-2 mt-3 pl-7">
                      <button type="button" onClick={() => handleReportAction(r.id, 'dismissed')}
                        className="px-4 py-2 rounded-full text-xs font-medium bg-surface-elevated text-secondary hover:bg-border transition">Ignorer</button>
                      <button type="button" onClick={() => handleReportAction(r.id, 'action_taken', r.reported_id, 'warn')}
                        className="px-4 py-2 rounded-full text-xs font-medium bg-warningBg text-warning hover:bg-warning/20 transition">Avertir</button>
                      <button type="button" onClick={() => handleReportAction(r.id, 'action_taken', r.reported_id, 'suspend')}
                        className="px-4 py-2 rounded-full text-xs font-medium bg-errorBg text-error hover:bg-error/20 transition">Suspendre</button>
                      <button type="button" onClick={() => setConfirmDialog({ title: 'Bannir', message: `Bannir ${r.reported?.name ?? 'cet utilisateur'} ?`, onConfirm: () => handleReportAction(r.id, 'action_taken', r.reported_id, 'ban') })}
                        className="px-4 py-2 rounded-full text-xs font-medium bg-errorBg text-error hover:bg-error/20 transition">Bannir</button>
                    </div>
                  )}
                </div>
              ))}
              {reports.length === 0 && <p className="text-secondary text-sm text-center">Aucun signalement</p>}

              {reportsTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button type="button" disabled={reportsPage <= 1} onClick={() => setReportsPage(p => p - 1)} aria-label="Page précédente"
                    className="p-2.5 rounded-full bg-surface-elevated text-secondary disabled:opacity-30"><ChevronLeft size={16} /></button>
                  <span className="text-sm text-secondary">{reportsPage} / {reportsTotalPages}</span>
                  <button type="button" disabled={reportsPage >= reportsTotalPages} onClick={() => setReportsPage(p => p + 1)} aria-label="Page suivante"
                    className="p-2.5 rounded-full bg-surface-elevated text-secondary disabled:opacity-30"><ChevronRight size={16} /></button>
                </div>
              )}
            </div>
          )}

          {tab === 'moderation' && (
            <div className="space-y-4">
              <p className="text-sm text-secondary">{modQueue.length} éléments en attente de modération</p>
              {modQueue.length === 0 && <p className="text-secondary text-sm">Aucun contenu à modérer</p>}
              {modQueue.map(item => (
                <div key={item.id} className="glass-card rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={16} className="text-primary" />
                    <span className="text-xs font-medium text-primary uppercase">{item.content_type}</span>
                    <span className="text-[10px] text-secondary">{new Date(item.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  {item.content_text && <p className="text-sm">{item.content_text}</p>}
                  <div className="flex gap-2 mt-3">
                    <button type="button" onClick={() => handleModeration(item.id, true)} disabled={adminActionLoading}
                      className="px-4 py-2 rounded-full text-xs font-medium bg-successBg text-success hover:bg-success/20 transition flex items-center gap-1 disabled:opacity-40">
                      <CheckCircle size={12} /> Approuver
                    </button>
                    <button type="button" onClick={() => handleModeration(item.id, false)} disabled={adminActionLoading}
                      className="px-4 py-2 rounded-full text-xs font-medium bg-errorBg text-error hover:bg-error/20 transition flex items-center gap-1 disabled:opacity-40">
                      <XCircle size={12} /> Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'verifications' && (
            <div className="space-y-4">
              {verifications.length === 0 && <p className="text-secondary text-sm">Aucune demande en attente</p>}
              {verifications.map(req => (
                <div key={req.id} className="glass-card rounded-2xl p-4 flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-xl bg-surface-elevated flex items-center justify-center shrink-0 overflow-hidden">
                    {req.photo_url ? (
                      <Image src={req.photo_url} alt="Photo vérification" fill className="object-cover" sizes="56px" />
                    ) : (
                      <BadgeCheck size={20} className="text-secondary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{req.profile?.name ?? 'Inconnu'}</p>
                    <p className="text-[10px] text-secondary">{new Date(req.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <button type="button" onClick={() => handleVerify(req.id, req.user_id, true)} disabled={adminActionLoading}
                    className="px-4 py-2 rounded-full text-xs font-medium bg-successBg text-success hover:bg-success/20 transition disabled:opacity-40">Approuver</button>
                  <button type="button" onClick={() => handleVerify(req.id, req.user_id, false)} disabled={adminActionLoading}
                    className="px-4 py-2 rounded-full text-xs font-medium bg-errorBg text-error hover:bg-error/20 transition disabled:opacity-40">Rejeter</button>
                </div>
              ))}
            </div>
          )}

          {tab === 'premium' && (
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-4">
                <h3 className="text-sm font-semibold mb-3">Attribuer Premium</h3>
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] text-secondary block mb-1">ID Utilisateur</label>
                    <input type="text" value={grantUserId} onChange={e => setGrantUserId(e.target.value)}
                      placeholder="UUID de l'utilisateur" className="w-full px-3 py-2.5 rounded-xl text-sm bg-surface-elevated border-none outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-[10px] text-secondary block mb-1">Plan</label>
                    <select value={grantPlan} onChange={e => setGrantPlan(e.target.value as 'premium_monthly' | 'premium_yearly')}
                      className="px-3 py-2.5 rounded-xl text-sm bg-surface-elevated border-none outline-none">
                      <option value="premium_monthly">Mensuel</option>
                      <option value="premium_yearly">Annuel</option>
                    </select>
                  </div>
                  <button type="button" onClick={handlePremiumGrant} disabled={adminActionLoading}
                    className="px-5 py-2.5 rounded-full text-sm font-medium bg-primary text-on-primary hover:opacity-90 transition disabled:opacity-40">Accorder</button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Abonnés Premium ({premiumUsers.length})</h3>
                <div className="glass-card rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 text-xs text-secondary font-medium">Nom</th>
                        <th className="text-left p-3 text-xs text-secondary font-medium">Email</th>
                        <th className="text-left p-3 text-xs text-secondary font-medium">Fin abonnement</th>
                        <th className="text-left p-3 text-xs text-secondary font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {premiumUsers.map(u => (
                        <tr key={u.id} className="border-b border-border/50">
                          <td className="p-3 font-medium">{u.name ?? '—'}</td>
                          <td className="p-3 text-secondary">{u.email ?? '—'}</td>
                          <td className="p-3 text-xs">{u.subscription_end ? new Date(u.subscription_end).toLocaleDateString('fr-FR') : '—'}</td>
                          <td className="p-3">
                            <button type="button" onClick={() => setConfirmDialog({ title: 'Révoquer Premium', message: `Révoquer le premium de ${u.name ?? 'cet utilisateur'} ?`, onConfirm: () => handlePremiumRevoke(u.id) })}
                              className="px-3 py-1.5 rounded-full text-xs font-medium bg-errorBg text-error hover:bg-error/20 transition">Révoquer</button>
                          </td>
                        </tr>
                      ))}
                      {premiumUsers.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-secondary text-sm">Aucun abonné premium</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'maintenance' && (
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Mode maintenance</h3>
                  <button type="button" role="switch" aria-checked={maintenanceActive} onClick={handleMaintenanceToggle} disabled={adminActionLoading}
                    aria-label={maintenanceActive ? 'Désactiver le mode maintenance' : 'Activer le mode maintenance'}
                    className={`relative w-12 h-6 rounded-full transition ${maintenanceActive ? 'bg-error' : 'bg-surface-elevated'} disabled:opacity-40`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ${maintenanceActive ? 'left-6' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-secondary block mb-1">Message de maintenance</label>
                    <input type="text" value={maintenanceMessage} onChange={e => setMaintenanceMessage(e.target.value)}
                      placeholder="Erosia est actuellement en maintenance..." className="w-full px-3 py-2.5 rounded-xl text-sm bg-surface-elevated border-none outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-[10px] text-secondary block mb-1">Durée estimée</label>
                    <input type="text" value={maintenanceDuration} onChange={e => setMaintenanceDuration(e.target.value)}
                      placeholder="Environ 2 heures" className="w-full px-3 py-2.5 rounded-xl text-sm bg-surface-elevated border-none outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Historique</h3>
                <div className="space-y-2">
                  {(maintenance?.logs ?? []).map(log => (
                    <div key={log.id} className="glass-card rounded-2xl p-3 flex items-center justify-between">
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          log.action === 'enabled' ? 'bg-errorBg text-error' : 'bg-successBg text-success'
                        }`}>{log.action}</span>
                        {log.message && <p className="text-xs text-secondary mt-1">{log.message}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-secondary">{log.admin?.name ?? 'Admin'}</p>
                        <p className="text-[10px] text-secondary">{new Date(log.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'retraits' && (
            <div className="space-y-4">
              {payoutsLoading && <p className="text-secondary text-sm">Chargement...</p>}
              {!payoutsLoading && payouts.length === 0 && <p className="text-secondary text-sm">Aucun retrait en attente</p>}
              {payouts.map(tx => {
                let details = { type: '', identifier: '' }
                try { details = JSON.parse(tx.payment_details ?? '{}') } catch { details = { type: '', identifier: '' } }
                return (
                  <div key={tx.id} className="glass-card rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Smartphone size={16} className="text-warning" />
                        <p className="font-medium text-sm">{tx.user_name}</p>
                      </div>
                      <p className="font-bold text-sm">{formatCFA(tx.amount_cents)}</p>
                    </div>
                    <p className="text-[10px] text-secondary mb-3">
                      {details.identifier || 'Inconnu'} — {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                    </p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handlePayoutAction(tx.id, 'completed')} disabled={adminActionLoading}
                        className="flex-1 py-2.5 rounded-full text-xs font-medium bg-successBg text-success hover:bg-success/20 transition flex items-center justify-center gap-1 disabled:opacity-40">
                        <CheckCircle size={12} /> Marquer effectué
                      </button>
                      <button type="button" onClick={() => handlePayoutAction(tx.id, 'failed')} disabled={adminActionLoading}
                        className="flex-1 py-2.5 rounded-full text-xs font-medium bg-errorBg text-error hover:bg-error/20 transition flex items-center justify-center gap-1 disabled:opacity-40">
                        <XCircle size={12} /> Marquer échoué
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-secondary" />
                <select value={logActionFilter} onChange={e => { setLogActionFilter(e.target.value); setLogsPage(1) }}
                  className="px-3 py-2.5 rounded-full text-sm bg-surface-elevated border-none outline-none">
                  <option value="all">Toutes les actions</option>
                  {logActionTypes.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div className="glass-card rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-xs text-secondary font-medium">Admin</th>
                      <th className="text-left p-3 text-xs text-secondary font-medium">Action</th>
                      <th className="text-left p-3 text-xs text-secondary font-medium">Cible</th>
                      <th className="text-left p-3 text-xs text-secondary font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(l => (
                      <tr key={l.id} className="border-b border-border/50">
                        <td className="p-3 font-medium text-xs">{l.admin?.name ?? 'Inconnu'}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">{l.action}</span>
                        </td>
                        <td className="p-3 text-xs text-secondary">{l.target_type} #{l.target_id?.slice(0, 8)}</td>
                        <td className="p-3 text-xs text-secondary">{new Date(l.created_at).toLocaleDateString('fr-FR')}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-secondary text-sm">Aucun log</td></tr>}
                  </tbody>
                </table>
              </div>

              {logsTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button type="button" disabled={logsPage <= 1} onClick={() => setLogsPage(p => p - 1)} aria-label="Page précédente"
                    className="p-2.5 rounded-full bg-surface-elevated text-secondary disabled:opacity-30"><ChevronLeft size={16} /></button>
                  <span className="text-sm text-secondary">{logsPage} / {logsTotalPages}</span>
                  <button type="button" disabled={logsPage >= logsTotalPages} onClick={() => setLogsPage(p => p + 1)} aria-label="Page suivante"
                    className="p-2.5 rounded-full bg-surface-elevated text-secondary disabled:opacity-30"><ChevronRight size={16} /></button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-surface/80 backdrop-blur-xl border-t border-border lg:hidden">
        <div className="flex overflow-x-auto">
          {navItems.map(t => {
            const Icon = t.icon
            return (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 min-w-0 transition ${tab === t.key ? 'text-primary' : 'text-secondary'}`}>
                <div className="relative">
                  <Icon size={18} />
                  {t.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-error text-white text-[8px] font-bold flex items-center justify-center">{t.badge > 9 ? '9+' : t.badge}</span>
                  )}
                </div>
                <span className="text-[9px] truncate w-full text-center">{t.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
