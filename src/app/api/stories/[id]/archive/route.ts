import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const { data: story } = await supabase
      .from('stories').select('user_id').eq('id', storyId).maybeSingle()
    if (!story) return apiError('Story introuvable', 404)
    if (story.user_id !== user.id) return apiError('Non autorisé', 403)

    const admin = createAdminClient()
    const { error } = await admin.from('stories').update({ archived: true }).eq('id', storyId)
    if (error) return apiError(error.message, 500)
    return apiResponse({ ok: true })
  } catch (err) {
    return apiServerError(err)
  }
}
