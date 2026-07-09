import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMessageSuggestions } from '@/lib/message-suggestions'
import { logger } from '@/lib/logger'
import { messageSuggestionsSchema } from '@/lib/validations'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    let body: Record<string, unknown>
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }
    const parsed = messageSuggestionsSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { matchId } = parsed.data

    const { data: match } = await supabase.from('matches').select('user1_id, user2_id').eq('id', matchId).maybeSingle()
    if (!match || (match.user1_id !== user.id && match.user2_id !== user.id)) {
      return NextResponse.json({ error: 'Match introuvable' }, { status: 403 })
    }

    const targetId = match.user1_id === user.id ? match.user2_id : match.user1_id

    const result = await generateMessageSuggestions({ userId: user.id, targetId, matchId })
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })

    return NextResponse.json({ suggestions: result.suggestions })
  } catch (err) {
    logger.error('Message suggestions route error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
