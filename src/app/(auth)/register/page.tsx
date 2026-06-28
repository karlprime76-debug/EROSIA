'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema } from '@/lib/validations'
import { Input } from '@/components/ui/form'
import { useState } from 'react'
import { motion } from 'motion/react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <div className="flex flex-col items-center justify-center flex-1 px-5 safe-pb safe-pt">
      <div className="glass-premium rounded-3xl p-8 max-w-sm w-full text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#34D399] to-[#10B981] flex items-center justify-center mx-auto mb-5 shadow-[0_0_24px_rgba(52,211,153,0.2)]"
        >
          <motion.div
            animate={{ rotate: [0, -10, 10, -5, 0] }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Sparkles size={28} className="text-white" />
          </motion.div>
        </motion.div>
        <h2 className="text-xl font-bold text-[var(--text)] mb-2">Inscription réussie !</h2>
        <p className="text-[var(--text-secondary)] text-sm mb-6">Vérifie ta boîte mail pour confirmer ton compte.</p>
        <Link href="/login">
          <Button variant="premium" size="pill-lg" className="w-full">
            Se connecter
          </Button>
        </Link>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-5 safe-pb safe-pt">
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="glass-premium rounded-3xl p-7 sm:p-8 space-y-5">
          {/* Header */}
          <div className="text-center space-y-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
              className="flex items-center justify-center gap-2 mb-4"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-light)] to-[var(--primary-dark)] flex items-center justify-center shadow-[var(--shadow-glow)]">
                <Sparkles size={18} className="text-white" />
              </div>
              <span className="text-xl font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-display)' }}>Erosia</span>
            </motion.div>
            <h2 className="text-[clamp(1.25rem,4vw,1.75rem)] font-bold text-[var(--text)] tracking-tight">Créer ton compte</h2>
            <p className="text-sm text-[var(--text-secondary)]">Rejoins l&rsquo;aventure</p>
          </div>

          {/* Error */}
          {(serverError || Object.keys(errors).length > 0) && (
            <motion.p
              role="alert"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-[var(--error)] text-center bg-[var(--error-bg)] rounded-xl py-2.5 px-4 border border-[rgba(248,113,113,0.15)]"
            >
              {serverError || Object.values(errors)[0]?.message}
            </motion.p>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Prénom" autoComplete="name" error={errors.name?.message}
              {...register('name')} placeholder="Prénom" />
            <Input label="Email" type="email" autoComplete="email" error={errors.email?.message}
              {...register('email')} placeholder="ton@email.com" />
            <Input label="Mot de passe" type="password" autoComplete="new-password" error={errors.password?.message}
              {...register('password')} placeholder="8 caractères minimum" />
            <Input label="Âge" type="number" error={errors.age?.message}
              {...register('age', { valueAsNumber: true })} placeholder="Ton âge" min={18} max={120} />
            <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed">
              En créant un compte, tu certifies avoir <strong className="text-[var(--text-secondary)]">18 ans ou plus</strong> et tu acceptes nos{' '}
              <a href="/cgu" target="_blank" className="underline text-[var(--primary)] hover:text-[var(--primary-light)] transition-colors">conditions générales</a>.
            </p>
            <Button type="submit" variant="premium" size="pill-lg" loading={isSubmitting} className="w-full">
              {isSubmitting ? 'Inscription…' : 'Créer mon compte'}
            </Button>
          </form>

          <div className="divider-gradient" />
          <Link href="/login" className="block text-center text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors duration-200">
            Déjà un compte ? <span className="text-[var(--primary)] font-medium">Se connecter</span>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
