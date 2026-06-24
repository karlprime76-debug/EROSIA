'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Flame, Heart, User, Settings } from 'lucide-react'

const tabs = [
  { href: '/discover', icon: Flame, label: 'Découvrir' },
  { href: '/matches', icon: Heart, label: 'Matchs' },
  { href: '/profile', icon: User, label: 'Profil' },
  { href: '/settings', icon: Settings, label: 'Réglages' },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full bg-[#141414] shadow-sm relative">
      <main className="flex-1 flex flex-col">{children}</main>
      <nav className="flex border-t border-[#2A2826] bg-[#141414] px-4 pb-3 pt-2 z-10" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center gap-0.5 py-1">
              <Icon size={24} className={active ? 'text-[#D92D4A]' : 'text-[#6B6258]'} />
              <span className={`text-xs font-medium ${active ? 'text-[#D92D4A]' : 'text-[#6B6258]'}`}>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
