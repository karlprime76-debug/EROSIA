import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Erosia",
  description: "Là où les cœurs se rencontrent",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-black text-[#F5F0EB]">{children}</body>
    </html>
  )
}
