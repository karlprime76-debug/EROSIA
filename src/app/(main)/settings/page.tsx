'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Eye, Trash2, Shield as ShieldIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function SettingsPage() {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Supprimer définitivement ton compte ? Cette action est irréversible.')) return
    setDeleting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').delete().eq('id', user.id)
      await supabase.auth.admin?.deleteUser(user.id)
    }
    await supabase.auth.signOut()
    router.push('/')
  }

  const sections = [
    {
      title: 'Confidentialité',
      items: [
        { icon: Eye, label: 'Qui peut te voir', desc: 'Tout le monde' },
        { icon: Bell, label: 'Notifications', desc: 'Push, email' },
      ],
    },
    {
      title: 'Compte',
      items: [
        { icon: ShieldIcon, label: 'Centres d\'aide', desc: 'Support et sécurité' },
        { icon: Trash2, label: 'Supprimer mon compte', desc: 'Irréversible', danger: true, action: handleDelete },
      ],
    },
  ]

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button onClick={() => router.back()} className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Paramètres</h2>
      </header>
      <div className="flex-1 px-4 space-y-6 pb-8">
        {sections.map(section => (
          <div key={section.title}>
            <h3 className="text-sm font-semibold text-[#9E9488] uppercase tracking-wider mb-2 px-1">{section.title}</h3>
            <div className="bg-[#1C1C1E] rounded-xl border border-[#2A2826] overflow-hidden">
              {section.items.map(({ icon: Icon, label, desc, danger, action }) => (
                <button key={label} onClick={action}
                  className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-[#2A2826] last:border-0 text-left">
                  <Icon size={20} className={danger ? 'text-[#D92D4A]' : 'text-[#6B6258]'} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${danger ? 'text-[#D92D4A]' : ''}`}>{label}</p>
                    <p className="text-xs text-[#6B6258]">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
        {deleting && <p className="text-center text-sm text-[#9E9488]">Suppression en cours...</p>}
      </div>
    </div>
  )
}
