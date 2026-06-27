import type { Metadata } from "next"
import "./globals.css"
import SwRegister from "@/components/SwRegister"
import { ToastProvider } from '@/components/Toast'
import { ConfirmProvider } from '@/components/ConfirmDialog'
import { Providers } from '@/components/Providers'
import { DynamicBackground } from '@/components/DynamicBackground'

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
    <html lang="fr" className="h-full antialiased dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('erosia_theme');if(!t||t==='system'){t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}})()`
        }} />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text)]">
        <DynamicBackground />
        <SwRegister />
        <div className="relative z-10 flex-1 flex flex-col">
          <Providers>
            <ToastProvider>
              <ConfirmProvider>
                {children}
              </ConfirmProvider>
            </ToastProvider>
          </Providers>
        </div>
      </body>
    </html>
  )
}
