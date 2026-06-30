import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createClient()

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')

  let query = supabase.from('safety_tips').select('*').order('priority', { ascending: false })

  if (category && ['dating', 'privacy', 'security', 'consent'].includes(category)) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}
