'use client'

import { useRouter } from 'next/navigation'
import { createEvent, type CreateEventInput } from '@/lib/events'
import { useToast } from '@/components/Toast'
import { EventForm } from '@/components/EventForm'

export default function CreateEventPage() {
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (input: CreateEventInput, file?: File) => {
    try {
      const { data, error } = await createEvent(input, file)
      if (error) { toast(error, 'error'); return }
      toast('Événement créé ✓', 'success')
      router.push(`/events/${data?.id}`)
    } catch { toast('Erreur', 'error') }
  }

  return <EventForm onSubmit={handleSubmit} onClose={() => router.back()} />
}
