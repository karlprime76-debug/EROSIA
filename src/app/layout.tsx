import type { Metadata } from "next"
import "./globals.css"
import { SensualBackground } from "@/components/3d/SensualBackground"
import SwRegister from "@/components/SwRegister"
import { ToastProvider } from '@/components/Toast'
import { ConfirmProvider } from '@/components/ConfirmDialog'

export const metadata: Metadata = {
  title: "Erosia",
  description: "Là où les cœurs se rencontrent",
  manifest: "/manifest.json",
  icons: {
    apple: { url: "/icone.png", sizes: "180x180", type: "image/png" },
  },
  other: { 'theme-color': '#D92D4A' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('erosia_theme');if(!t||t==='system'){t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}})()`
        }} />
      </head>
      <body className="min-h-full flex flex-col bg-black text-[#F5F0EB]">
        <SensualBackground />
        <SwRegister />
        <div className="relative z-10 flex-1 flex flex-col"><ToastProvider><ConfirmProvider>{children}</ConfirmProvider></ToastProvider></div>
      </body>
    </html>
  )
}
