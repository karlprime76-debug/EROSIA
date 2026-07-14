import { validateFile } from '@/lib/media'
import { createClient } from '@/lib/supabase/server'
import { uploadStory as uploadStorySvc } from '@/lib/stories'
import { createStorySchema } from '@/lib/validations'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return apiError('Fichier requis', 400)
    const err = validateFile(file, 'story')
    if (err) return apiError(err, 400)

    const parsed = createStorySchema.safeParse({ privacy: formData.get('privacy') as string ?? 'public' })
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return apiError(firstError, 400)
    }
    const privacy = parsed.data.privacy ?? 'public'

    const result = await uploadStorySvc(file, privacy as 'public' | 'close_friends')
    if (result.error) return apiError(result.error, 400)

    return apiResponse({ story: result.data })
  } catch (err) {
    return apiServerError(err)
  }
}
