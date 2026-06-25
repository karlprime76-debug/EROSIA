'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import Image from 'next/image'
import { getModerationQueue, reviewContent } from '@/lib/api'

interface VerificationRequest {
  id: string
  user_id: string
  photo_url: string
  status: string
  created_at: string
  profile?: { name: string; photos: string[] }
}

interface ModerationItem {
  id: string
  content_type: string
  content_id: string
  content_text?: string
  status?: string
  reviewed: boolean
  created_at: string
}

const ADMIN_EMAILS = ['karlprime76@gmail.com']

export default function AdminPage() {
  const [userEmail, setUserEmail] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [verifications, setVerifications] = useState<VerificationRequest[]>([])
  const [modQueue, setModQueue] = useState<ModerationItem[]>([])
  const [tab, setTab] = useState<'verifications' | 'moderation'>('verifications')

  const loadData = async () => {
    const { data: vData } = await supabase
      .from('verification_requests')
      .select('*, profile:profiles!verification_requests_user_id_fkey(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (vData) setVerifications(vData as unknown as VerificationRequest[])

    const { data: mData } = await getModerationQueue()
    if (mData) setModQueue(mData as ModerationItem[])
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.email) return
      setUserEmail(user.email)
      if (ADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(true)
        loadData()
      }
    })
  }, [])

  const handleVerify = async (reqId: string, userId: string, approved: boolean) => {
    const admin = supabase.auth.getSession()
    if (!admin) return

    const { error: updateError } = await supabase
      .from('verification_requests')
      .update({ status: approved ? 'approved' : 'rejected' })
      .eq('id', reqId)
    if (updateError) return alert(updateError.message)

    if (approved) {
      await supabase.from('profiles').update({ is_verified: true }).eq('id', userId)
    }

    setVerifications(v => v.filter(r => r.id !== reqId))
  }

  const handleModeration = async (id: string, approved: boolean) => {
    await reviewContent(id, approved)
    setModQueue(m => m.filter(i => i.id !== id))
  }

  if (!isAdmin) return (
    <div className="min-h-dvh flex items-center justify-center px-6 bg-transparent">
      <div className="glass-card rounded-3xl p-8 max-w-sm w-full text-center">
        <h2 className="text-xl font-bold mb-2">Accès restreint</h2>
        <p className="text-[#9E9488] text-sm">{userEmail ? 'Accès admin uniquement' : 'Connecte-toi avec un compte admin'}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-transparent px-4 py-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Administration</h2>
      <div className="flex gap-3 mb-6">
        <button onClick={() => setTab('verifications')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${tab === 'verifications' ? 'bg-[#D92D4A] text-white' : 'bg-[#1C1C1E] text-[#9E9488]'}`}>
          Vérifications ({verifications.length})
        </button>
        <button onClick={() => setTab('moderation')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${tab === 'moderation' ? 'bg-[#D92D4A] text-white' : 'bg-[#1C1C1E] text-[#9E9488]'}`}>
          Modération ({modQueue.length})
        </button>
      </div>

      {tab === 'verifications' && (
        <div className="space-y-4">
          {verifications.length === 0 && <p className="text-[#9E9488] text-sm">Aucune demande en attente</p>}
          {verifications.map((req) => (
            <div key={req.id} className="glass-card rounded-2xl p-4 flex items-center gap-4">
              {req.photo_url && (
                <Image src={req.photo_url} alt="Selfie" width={64} height={64} className="w-16 h-16 rounded-xl object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{req.profile?.name ?? 'Inconnu'}</p>
                <p className="text-[10px] text-[#6B6258]">{new Date(req.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
              <button onClick={() => handleVerify(req.id, req.user_id, true)}
                className="px-4 py-2 rounded-full text-xs font-medium bg-green-600/20 text-green-400 hover:bg-green-600/30 transition">Approuver</button>
              <button onClick={() => handleVerify(req.id, req.user_id, false)}
                className="px-4 py-2 rounded-full text-xs font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 transition">Rejeter</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'moderation' && (
        <div className="space-y-4">
          {modQueue.length === 0 && <p className="text-[#9E9488] text-sm">Aucun contenu à modérer</p>}
          {modQueue.map((item) => (
            <div key={item.id} className="glass-card rounded-2xl p-4">
              <p className="text-xs font-medium text-[#D92D4A] uppercase">{item.content_type}</p>
              {item.content_text && <p className="text-sm mt-1">{item.content_text}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => handleModeration(item.id, true)}
                  className="px-4 py-2 rounded-full text-xs font-medium bg-green-600/20 text-green-400 hover:bg-green-600/30 transition">Approuver</button>
                <button onClick={() => handleModeration(item.id, false)}
                  className="px-4 py-2 rounded-full text-xs font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 transition">Rejeter</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
