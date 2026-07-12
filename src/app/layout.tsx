import type { Metadata, Viewport } from "next"
import { Inter, Playfair_Display } from 'next/font/google'
import "./globals.css"
import SwRegister from "@/components/SwRegister"
import { ToastProvider } from '@/components/Toast'
import { ConfirmProvider } from '@/components/ConfirmDialog'
import { Providers } from '@/components/Providers'
import { DynamicBackground } from '@/components/DynamicBackground'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { LocaleProvider } from '@/lib/i18n'
import { OnboardingProvider } from '@/lib/onboarding/provider'

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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erosia.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Erosia — Là où les cœurs se rencontrent",
    template: "%s — Erosia",
  },
  description: "Là où les cœurs se rencontrent",
  manifest: "/manifest.json",
  icons: {
    icon: { url: "/favicon.svg", type: "image/svg+xml" },
    apple: { url: "/icone.png", sizes: "180x180", type: "image/png" },
  },
  openGraph: {
    type: "website",
    siteName: "Erosia",
    title: "Erosia — Là où les cœurs se rencontrent",
    description: "Là où les cœurs se rencontrent",
    url: "/",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Erosia — Là où les cœurs se rencontrent",
    description: "Là où les cœurs se rencontrent",
  },
  robots: {
    index: true,
    follow: true,
  },
}

const THEME_COLOR = process.env.NEXT_PUBLIC_PRIMARY_COLOR || '#D92D4A'

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`h-full antialiased ${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content={THEME_COLOR} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col bg-theme overflow-x-hidden"
        style={{ fontFamily: 'var(--fontBody)' }}>
        <ThemeProvider>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-on-primary focus:rounded-lg">
            Aller au contenu principal
          </a>
          <DynamicBackground />
          <SwRegister />
          <div className="relative z-10 flex-1 flex flex-col">
              <Providers>
                <LocaleProvider>
                  <OnboardingProvider>
                    <ToastProvider>
                      <ConfirmProvider>
                        <ErrorBoundary>
                    <main id="main-content" className="flex-1 flex flex-col">
                      {children}
                    </main>
                  </ErrorBoundary>
                </ConfirmProvider>
              </ToastProvider>
                  </OnboardingProvider>
                </LocaleProvider>
            </Providers>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
