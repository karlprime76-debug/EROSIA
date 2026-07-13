'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema } from '@/lib/validations'
import { useState, useRef, Suspense } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Eye, EyeOff, Sparkles, ArrowRight, Gift, Mail, Lock, User, Calendar, Venus, Mars, Check, X } from 'lucide-react'

import { Button } from '@/components/ui/button'

type RegisterValues = { email: string; password: string; name: string; age: number; gender: 'male' | 'female' | 'non_binary'; interestedIn: ('male' | 'female' | 'non_binary')[] }

const strengthLabels = ['', 'Faible', 'Moyen', 'Fort', 'Très fort'] as const
const strengthColors = ['', 'var(--error)', 'var(--warning)', 'var(--success)', 'var(--success)'] as const

function getPasswordStrength(pw: string): number {
  let s = 0
  if (pw.length >= 8) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^a-zA-Z0-9]/.test(pw)) s++
  return s
}

function RegisterPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [serverError, setServerError] = useState(() => {
    const err = searchParams.get('error')
    return err === 'session_expired' ? 'Session expirée. Inscris-toi à nouveau.' : ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const submittedRef = useRef(false)

  const [referralCode, setReferralCode] = useState(() =>
    searchParams.get('ref')?.toUpperCase() ?? ''
  )

  const [showReferralInput, setShowReferralInput] = useState(() =>
    !!searchParams.get('ref')
  )

  const { register: reg, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { interestedIn: [], gender: undefined },
  })
  const watchInterestedIn = watch('interestedIn')
  const watchGender = watch('gender')
  const watchPassword = watch('password')

  const passwordStrength = getPasswordStrength(watchPassword || '')
  const canSubmit = agreeTerms && !isSubmitting && !submittedRef.current

  const onSubmit = async (data: RegisterValues) => {
    if (submittedRef.current) return
    if (!agreeTerms) { setServerError("Tu dois accepter les conditions d'utilisation"); return }
    setServerError('')
    submittedRef.current = true
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, referralCode: referralCode || undefined }),
      })
      const json = await res.json()
      if (!res.ok) { setServerError(json.error ?? "Erreur lors de l'inscription"); submittedRef.current = false; return }
      if (json.autoLogin === false) {
        setServerError('Compte créé mais connexion automatique échouée — connecte-toi.')
        return
      }
      router.push('/onboarding')
    } catch {
      setServerError('Erreur réseau — vérifie ta connexion')
      submittedRef.current = false
    }
  }

  const firstError = serverError || Object.values(errors)[0]?.message

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-5 safe-pb safe-pt relative">
      <div className="pointer-events-none absolute top-1/4 right-1/4 w-72 h-72 rounded-full bg-[var(--primary)] blur-[160px] opacity-[0.07]" />
      <div className="pointer-events-none absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full bg-[var(--accent-warm)] blur-[140px] opacity-[0.05]" />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        <div
          className="relative overflow-hidden rounded-3xl border border-white/6 shadow-[0_32px_80px_rgba(0,0,0,0.5),_inset_0_1px_0_rgba(255,255,255,0.04)]"
          style={{ background: 'linear-gradient(145deg, rgba(24,24,26,0.92), rgba(15,15,17,0.96))' }}
        >
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-[var(--primary)] blur-3xl opacity-[0.08] pointer-events-none" />

          <div className="relative z-10 p-7 sm:p-8 space-y-5">
            <div className="text-center space-y-2">
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                className="flex items-center justify-center gap-2.5 mb-4"
              >
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center shadow-[0_8px_24px_var(--primaryGlow)] border border-theme">
                  <Sparkles size={20} className="text-on-primary" />
                </div>
                <span className="text-2xl font-bold text-theme tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Erosia</span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-bold text-theme tracking-tight"
              >
                Crée ton univers ✨
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-secondary"
              >
                Rejoins une communauté de rencontres premium
              </motion.p>
            </div>

            <AnimatePresence>
              {firstError && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm text-[var(--error)] bg-[var(--error-bg)] rounded-2xl py-3 px-4 border border-[rgba(248,113,113,0.15)] text-center"
                >
                  {firstError}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="reg-name" className="text-xs font-semibold text-secondary block tracking-wider uppercase">Prénom</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors duration-200">
                    <User size={15} />
                  </div>
                  <input
                    id="reg-name"
                    {...reg('name')}
                    type="text"
                    placeholder="Ton prénom"
                    autoComplete="given-name"
                    className="w-full bg-surface/50 text-theme border border-theme rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none transition-all duration-200 focus:border-[var(--primary)] focus:bg-surface focus:shadow-[0_0_0_3px_var(--primaryGlow)] placeholder:text-muted"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reg-email" className="text-xs font-semibold text-secondary block tracking-wider uppercase">Email</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors duration-200">
                    <Mail size={15} />
                  </div>
                  <input
                    id="reg-email"
                    {...reg('email')}
                    type="email"
                    placeholder="ton@email.com"
                    autoComplete="email"
                    className="w-full bg-surface/50 text-theme border border-theme rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none transition-all duration-200 focus:border-[var(--primary)] focus:bg-surface focus:shadow-[0_0_0_3px_var(--primaryGlow)] placeholder:text-muted"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reg-password" className="text-xs font-semibold text-secondary block tracking-wider uppercase">Mot de passe</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors duration-200">
                    <Lock size={15} />
                  </div>
                  <input
                    id="reg-password"
                    {...reg('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="8 caractères minimum"
                    autoComplete="new-password"
                    minLength={8}
                    className="w-full bg-surface/50 text-theme border border-theme rounded-xl pl-10 pr-12 py-3.5 text-sm outline-none transition-all duration-200 focus:border-[var(--primary)] focus:bg-surface focus:shadow-[0_0_0_3px_var(--primaryGlow)] placeholder:text-muted"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-theme transition-colors duration-200 p-1"
                    aria-label={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {watchPassword && watchPassword.length >= 8 && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-1 flex-1 rounded-full transition-colors"
                          style={{ background: i <= passwordStrength ? strengthColors[passwordStrength] : 'rgba(255,255,255,0.1)' }} />
                      ))}
                    </div>
                    <span className="text-[10px] text-muted">{strengthLabels[passwordStrength]}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reg-age" className="text-xs font-semibold text-secondary block tracking-wider uppercase">Âge</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors duration-200">
                    <Calendar size={15} />
                  </div>
                  <input
                    id="reg-age"
                    {...reg('age', { valueAsNumber: true })}
                    type="number"
                    placeholder="Ton âge (18+)"
                    min={18}
                    max={100}
                    inputMode="numeric"
                    className="w-full bg-surface/50 text-theme border border-theme rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none transition-all duration-200 focus:border-[var(--primary)] focus:bg-surface focus:shadow-[0_0_0_3px_var(--primaryGlow)] placeholder:text-muted"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-secondary block tracking-wider uppercase">Je suis</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['male', 'female', 'non_binary'] as const).map(g => (
                    <label key={g} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      watchGender === g
                        ? 'border-primary bg-primary/10'
                        : 'border-theme bg-surface hover:border-primary/30'
                    }`}>
                      <input type="radio" {...reg('gender')} value={g} className="sr-only" />
                      {g === 'male' ? <Mars size={18} className={watchGender === g ? 'text-primary' : 'text-secondary'} /> :
                       g === 'female' ? <Venus size={18} className={watchGender === g ? 'text-primary' : 'text-secondary'} /> :
                       <span className="text-base">⚧</span>}
                      <span className="text-[11px] font-medium">{g === 'male' ? 'Homme' : g === 'female' ? 'Femme' : 'Non binaire'}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-secondary block tracking-wider uppercase">Je cherche</label>
                <div className="flex flex-wrap gap-2">
                  {(['male', 'female', 'non_binary'] as const).map(g => {
                    const checked = (watchInterestedIn || []).includes(g)
                    return (
                      <label key={g} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                        checked ? 'border-primary bg-primary/10' : 'border-theme bg-surface hover:border-primary/30'
                      }`}>
                        <input type="checkbox" checked={checked} onChange={() => {
                          const current = watchInterestedIn || []
                          const next = checked ? current.filter(x => x !== g) : [...current, g]
                          setValue('interestedIn', next, { shouldValidate: true })
                        }} className="sr-only" />
                        {g === 'male' ? <Mars size={16} className={checked ? 'text-primary' : 'text-secondary'} /> :
                         g === 'female' ? <Venus size={16} className={checked ? 'text-primary' : 'text-secondary'} /> :
                         <span className="text-sm">⚧</span>}
                        <span className="text-xs font-medium">{g === 'male' ? 'Hommes' : g === 'female' ? 'Femmes' : 'Non binaires'}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer group pt-1" htmlFor="reg-terms">
                <div
                  onClick={() => setAgreeTerms(v => !v)}
                  className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer ${
                    agreeTerms
                      ? 'bg-[var(--primary)] border-[var(--primary)] shadow-[0_2px_10px_var(--primaryGlow)]'
                      : 'bg-transparent border-white/15 group-hover:border-white/25'
                  }`}
                >
                  <AnimatePresence>
                    {agreeTerms && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }}>
                        <Check size={12} className="text-on-primary" strokeWidth={3} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <input id="reg-terms" type="checkbox" className="sr-only" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} />
                <span className="text-xs text-muted leading-relaxed">
                  J&rsquo;ai 18 ans ou plus et j&rsquo;accepte les{' '}
                   <Link href="/cgu" className="text-primary hover:text-primary underline transition-colors duration-200">CGU</Link>
                  {' '}et la{' '}
                  <Link href="/privacy" className="text-primary hover:text-primary underline transition-colors duration-200">politique de confidentialité</Link>.
                </span>
              </label>

              {!showReferralInput ? (
                <button type="button" onClick={() => setShowReferralInput(true)}
                  className="text-xs text-muted hover:text-secondary transition-colors duration-200 flex items-center gap-1.5 mx-auto">
                  <Gift size={13} />
                  J&rsquo;ai un code de parrainage
                </button>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="reg-ref" className="text-xs font-semibold text-secondary tracking-wider uppercase">Code de parrainage (optionnel)</label>
                    <button type="button" onClick={() => setShowReferralInput(false)}
                      className="text-muted hover:text-theme transition-colors p-1" aria-label="Fermer">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors duration-200">
                      <Gift size={15} />
                    </div>
                    <input
                      id="reg-ref"
                      type="text"
                      value={referralCode}
                      onChange={e => setReferralCode(e.target.value.toUpperCase().slice(0, 8))}
                      placeholder="EX: ABCD1234"
                      autoComplete="off"
                      maxLength={8}
                      className="w-full bg-surface/50 text-theme border border-theme rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none transition-all duration-200 focus:border-[var(--primary)] focus:bg-surface focus:shadow-[0_0_0_3px_var(--primaryGlow)] placeholder:text-muted tracking-widest font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="premium"
                  size="pill-lg"
                  loading={isSubmitting}
                  disabled={!canSubmit}
                  className="w-full text-sm font-semibold tracking-wide"
                  id="register-submit"
                  title={!agreeTerms ? "Accepte les conditions d'utilisation pour continuer" : undefined}
                >
                  {isSubmitting ? 'Création…' : 'Créer mon compte'}
                  {!isSubmitting && <ArrowRight size={18} />}
                </Button>
                {!agreeTerms && (
                  <p className="text-[10px] text-muted text-center mt-1">
                    Accepte les CGU pour créer ton compte
                  </p>
                )}
              </div>
            </form>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-theme" />
              <span className="text-xs text-muted font-medium tracking-wider uppercase">ou</span>
              <div className="flex-1 h-px bg-theme" />
            </div>
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 text-sm font-semibold text-secondary hover:text-theme transition-colors duration-200 group"
            >
              Déjà un compte ?
              <span className="text-primary group-hover:text-primary transition-colors duration-200">Se connecter</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} /></div>}>
      <RegisterPageContent />
    </Suspense>
  )
}
