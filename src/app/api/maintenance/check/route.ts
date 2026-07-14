import { createClient } from '@/lib/supabase/server'
import { apiResponse } from '@/lib/api-response'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('maintenance_mode')
      .select('active, message, estimated_duration')
      .limit(1)
      .maybeSingle()
    return apiResponse({
      maintenance: data?.active ?? false,
      message: data?.message ?? null,
      estimated_duration: data?.estimated_duration ?? null,
    })
  } catch {
    return apiResponse({ maintenance: false, message: null, estimated_duration: null })
  }
}
