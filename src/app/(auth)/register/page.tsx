'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema } from '@/lib/validations'
import { Input } from '@/components/ui/form'
import { useState } from 'react'

type RegisterValues = { email: string; password: string; name: string; age: number }

export default function RegisterPage() {
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterValues) => {
    setServerError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) { setServerError(json.error ?? "Erreur lors de l'inscription"); return }
      setSuccess(true)
    } catch {
      setServerError('Erreur réseau')
    }
  }

  if (success) return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-transparent">
      <div className="glass-card rounded-3xl p-8 max-w-sm w-full text-center">
        <h2 className="text-xl font-bold mb-2">Inscription réussie !</h2>
        <p className="text-[#9E9488] text-sm mb-6">Vérifie ta boîte mail pour confirmer ton compte.</p>
        <Link href="/login" className="inline-block w-full py-3.5 rounded-full text-white font-semibold text-center" style={{ background: '#D92D4A' }}>Se connecter</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-transparent">
      <div className="w-full max-w-sm glass-card rounded-3xl p-8 space-y-4">
        <h2 className="text-2xl font-bold text-center">Inscription</h2>
        {(serverError || Object.keys(errors).length > 0) && (
          <p className="text-sm text-red-500 text-center bg-red-500/10 rounded-lg py-2">
            {serverError ?? Object.values(errors)[0]?.message}
          </p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Prénom" autoComplete="name" error={errors.name?.message}
            {...register('name')} placeholder="Prénom" />
          <Input label="Email" type="email" autoComplete="email" error={errors.email?.message}
            {...register('email')} placeholder="Email" />
          <Input label="Mot de passe" type="password" autoComplete="new-password" error={errors.password?.message}
            {...register('password')} placeholder="Mot de passe (8+ car.)" />
          <Input label="Âge" type="number" error={errors.age?.message}
            {...register('age', { valueAsNumber: true })} placeholder="Âge" min={18} max={120} />
          <p className="text-xs text-[#6B6258] text-center">En créant un compte, tu certifies avoir <strong className="text-[#9E9488]">18 ans ou plus</strong> et tu acceptes nos <a href="/cgu" target="_blank" className="underline text-[#D92D4A]">conditions générales</a>.</p>
          <button type="submit" disabled={isSubmitting}
            className="w-full py-3.5 rounded-full text-white font-semibold disabled:opacity-40 transition-all active:scale-95" style={{ background: '#D92D4A' }}>
            {isSubmitting ? 'Inscription...' : 'Créer mon compte'}
          </button>
        </form>
        <Link href="/login" className="block text-center text-sm text-[#9E9488] hover:text-white transition">Déjà un compte ?</Link>
      </div>
    </div>
  )
}
