import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

const adminVerifySchema = z.object({
  requestId: z.string().uuid(),
  userId: z.string().uuid(),
  approved: z.boolean(),
  rejectionReason: z.string().max(500).optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const body = await request.json()
    const parsed = adminVerifySchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    const { requestId, userId, approved, rejectionReason } = parsed.data

    const admin = createAdminClient()
    const newStatus = approved ? 'approved' : 'rejected'

    const { error: reqError } = await admin
      .from('verification_requests')
      .update({
        status: newStatus,
        verified_at: approved ? new Date().toISOString() : null,
        rejection_reason: approved ? null : (rejectionReason ?? null),
      })
      .eq('id', requestId)

    if (reqError) {
      logger.error('Admin verify: DB error', { error: reqError.message })
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    const { error: profileError } = await admin
      .from('profiles')
      .update({
        verification_status: newStatus,
        is_verified: approved,
        verified_at: approved ? new Date().toISOString() : null,
        didit_verification_id: null,
      })
      .eq('id', userId)

    if (profileError) {
      logger.error('Admin verify: profile update error', { error: profileError.message })
    }

    await admin.from('notifications').insert({
      user_id: userId,
      type: 'verification',
      title: approved ? 'Vérification approuvée' : 'Vérification refusée',
      message: approved
        ? 'Votre identité a été vérifiée avec succès.'
        : (rejectionReason ? `Votre vérification a été refusée : ${rejectionReason}` : 'Votre vérification d\'identité a été refusée.'),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Admin verify POST error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
