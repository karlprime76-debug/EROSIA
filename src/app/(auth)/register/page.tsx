'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema } from '@/lib/validations'
import { Input } from '@/components/ui/form'
import { useState } from 'react'
import { motion } from 'motion/react'
import { Sparkles } from 'lucide-react'

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
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl p-8 max-w-sm w-full text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#34D399] to-[#10B981] flex items-center justify-center mx-auto mb-5 shadow-[0_0_20px_rgba(52,211,153,0.2)]">
          <Sparkles size={28} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-[#F5F0EB] mb-2">Inscription réussie !</h2>
        <p className="text-[#A09890] text-sm mb-6">Vérifie ta boîte mail pour confirmer ton compte.</p>
        <Link href="/login"
          className="inline-block w-full py-3.5 rounded-full text-white font-semibold text-sm bg-[#D92D4A] shadow-[0_4px_16px_rgba(217,45,74,0.25)] hover:shadow-[0_6px_24px_rgba(217,45,74,0.4)] transition-all duration-300">
          Se connecter
        </Link>
      </motion.div>
    </div>
  )

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-transparent">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <div className="glass rounded-3xl p-8 space-y-5">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D92D4A] to-[#A8102A] flex items-center justify-center shadow-[0_0_16px_rgba(217,45,74,0.25)]">
                <Sparkles size={18} className="text-white" />
              </div>
              <span className="text-xl font-bold text-[#F5F0EB]" style={{ fontFamily: 'var(--font-playfair)' }}>Erosia</span>
            </div>
            <h2 className="text-2xl font-bold text-[#F5F0EB]">Créer ton compte</h2>
            <p className="text-sm text-[#A09890]">Rejoins l&rsquo;aventure</p>
          </div>

          {(serverError || Object.keys(errors).length > 0) && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-[#F87171] text-center bg-[rgba(248,113,113,0.1)] rounded-xl py-2.5 px-4 border border-[rgba(248,113,113,0.15)]"
            >
              {serverError ?? Object.values(errors)[0]?.message}
            </motion.p>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Prénom" autoComplete="name" error={errors.name?.message}
              {...register('name')} placeholder="Prénom" />
            <Input label="Email" type="email" autoComplete="email" error={errors.email?.message}
              {...register('email')} placeholder="ton@email.com" />
            <Input label="Mot de passe" type="password" autoComplete="new-password" error={errors.password?.message}
              {...register('password')} placeholder="8 caractères minimum" />
            <Input label="Âge" type="number" error={errors.age?.message}
              {...register('age', { valueAsNumber: true })} placeholder="Ton âge" min={18} max={120} />
            <p className="text-xs text-[#6B6560] text-center leading-relaxed">
              En créant un compte, tu certifies avoir <strong className="text-[#A09890]">18 ans ou plus</strong> et tu acceptes nos{' '}
              <a href="/cgu" target="_blank" className="underline text-[#D92D4A] hover:text-[#FF3B5C] transition-colors">conditions générales</a>.
            </p>
            <button type="submit" disabled={isSubmitting}
              className="w-full py-3.5 rounded-full text-white font-semibold text-sm disabled:opacity-40 transition-all duration-300 active:scale-[0.97] bg-[#D92D4A] shadow-[0_4px_16px_rgba(217,45,74,0.25)] hover:shadow-[0_6px_24px_rgba(217,45,74,0.4)]">
              {isSubmitting ? 'Inscription...' : 'Créer mon compte'}
            </button>
          </form>

          <div className="divider-gradient" />
          <Link href="/login" className="block text-center text-sm text-[#A09890] hover:text-[#F5F0EB] transition-colors duration-200">
            Déjà un compte ? <span className="text-[#D92D4A] font-medium">Se connecter</span>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
