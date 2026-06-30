'use client'

import { useParams, useRouter } from 'next/navigation'
import { CompatibilityDashboard } from '@/components/compatibility/Dashboard'

export default function CompatibilityPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const router = useRouter()

  return (
    <CompatibilityDashboard matchId={matchId} onBack={() => router.back()} />
  )
}
