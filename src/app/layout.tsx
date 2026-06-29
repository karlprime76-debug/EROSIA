import type { Metadata, Viewport } from "next"
import { Inter, Playfair_Display } from 'next/font/google'
import "./globals.css"
import SwRegister from "@/components/SwRegister"
import { ToastProvider } from '@/components/Toast'
import { ConfirmProvider } from '@/components/ConfirmDialog'
import { Providers } from '@/components/Providers'
import { DynamicBackground } from '@/components/DynamicBackground'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ThemeProvider } from 'next-themes'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: "Erosia",
  description: "Là où les cœurs se rencontrent",
  manifest: "/manifest.json",
  icons: {
    icon: { url: "/favicon.svg", type: "image/svg+xml" },
    apple: { url: "/icone.png", sizes: "180x180", type: "image/png" },
  },
}

export const viewport: Viewport = {
  themeColor: '#D92D4A',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`h-full antialiased ${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#D92D4A" />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text)] overflow-x-hidden"
        style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[var(--primary)] focus:text-white focus:rounded-lg">
            Aller au contenu principal
          </a>
          <DynamicBackground />
          <SwRegister />
          <div className="relative z-10 flex-1 flex flex-col">
            <Providers>
              <ToastProvider>
                <ConfirmProvider>
                  <ErrorBoundary>
                    <main id="main-content" className="flex-1 flex flex-col">
                      {children}
                    </main>
                  </ErrorBoundary>
                </ConfirmProvider>
              </ToastProvider>
            </Providers>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
