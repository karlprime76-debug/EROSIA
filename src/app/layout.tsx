import type { Metadata } from "next"
import "./globals.css"
import BackgroundWrapper from "@/components/3d/BackgroundWrapper"

export const metadata: Metadata = {
  title: "Erosia",
  description: "Là où les cœurs se rencontrent",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-black text-[#F5F0EB]">
        <BackgroundWrapper>{children}</BackgroundWrapper>
      </body>
    </html>
  )
}
