import type { Metadata } from "next"
import "./globals.css"
import { SensualBackground } from "@/components/3d/SensualBackground"
import SwRegister from "@/components/SwRegister"

export const metadata: Metadata = {
  title: "Erosia",
  description: "Là où les cœurs se rencontrent",
  manifest: "/manifest.json",
  other: { 'theme-color': '#0A0A0A' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-black text-[#F5F0EB]">
        <SensualBackground />
        <SwRegister />
        <div className="relative z-10 flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  )
}
