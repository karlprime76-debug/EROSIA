'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Flame, Heart, User } from 'lucide-react'

const tabs = [
  { href: '/discover', icon: Flame, label: 'Découvrir' },
  { href: '/matches', icon: Heart, label: 'Matchs' },
  { href: '/profile', icon: User, label: 'Profil' },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full bg-white shadow-sm relative">
      <main className="flex-1 flex flex-col">{children}</main>
      <nav className="flex border-t border-zinc-200 bg-white px-4 pb-3 pt-2 z-10" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center gap-0.5 py-1">
              <Icon size={24} className={active ? 'text-rose-500' : 'text-zinc-400'} />
              <span className={`text-xs font-medium ${active ? 'text-rose-500' : 'text-zinc-400'}`}>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
