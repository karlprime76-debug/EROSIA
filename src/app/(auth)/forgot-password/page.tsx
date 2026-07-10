'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [captchaFailed, setCaptchaFailed] = useState(false)
  const captchaLoadedRef = useRef(false)

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    if (!siteKey) { captchaLoadedRef.current = true; return }
    const existing = document.querySelector('script[src*="turnstile/v0/api.js"]')
    if (existing) { captchaLoadedRef.current = true; return }
    let cancelled = false
    const timeout = setTimeout(() => {
      if (!captchaLoadedRef.current && !cancelled) {
        captchaLoadedRef.current = true
        setCaptchaFailed(true)
      }
    }, 10000)
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.onload = () => {
      if (cancelled) return
      clearTimeout(timeout)
      const w = window as unknown as { turnstile?: { render: (id: string, opts: Record<string, string>) => void } }
      if (w.turnstile?.render) {
        w.turnstile.render('turnstile-widget', { sitekey: siteKey, theme: 'dark' })
        captchaLoadedRef.current = true
      }
    }
    script.onerror = () => {
      if (cancelled) return
      clearTimeout(timeout)
      captchaLoadedRef.current = true
      setCaptchaFailed(true)
    }
    document.head.appendChild(script)
    return () => { cancelled = true; clearTimeout(timeout) }
  }, [])

  const getTurnstileToken = (): string => {
    if (captchaFailed) return '__skip__'
    try {
      const w = window as unknown as { turnstile?: { getResponse: () => string } }
      if (w.turnstile?.getResponse) {
        const token = w.turnstile.getResponse()
        if (token) return token
        if (captchaLoadedRef.current) return '__skip__'
        return ''
      }
      if (captchaLoadedRef.current) return '__skip__'
    } catch {}
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    if (!email.trim()) { setError('Email requis'); setLoading(false); return }
    const turnstileToken = getTurnstileToken()
    if (!captchaFailed && !turnstileToken && !captchaLoadedRef.current) {
      setError('Vérification de sécurité pas encore chargée — attends un instant')
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, turnstileToken }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur'); setLoading(false); return }
      setSent(true); setLoading(false)
    } catch {
      setError('Erreur réseau'); setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="flex-1 flex items-center justify-center px-5 safe-pb safe-pt">
        <h1 className="sr-only">Email envoyé</h1>
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass-premium rounded-3xl p-8 max-w-sm w-full text-center relative z-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--success)] to-[var(--successVibrant)] flex items-center justify-center mx-auto mb-5 shadow-[0_0_24px_var(--successBg)]"
          >
            <Sparkles size={28} className="text-on-primary" />
          </motion.div>
          <h2 className="text-xl font-bold text-[var(--text)] mb-2">Email envoyé !</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-2">Vérifie ta boîte de réception.</p>
          <p className="text-[var(--text-muted)] text-sm mb-6">Un lien de réinitialisation t&rsquo;a été envoyé à {email}</p>
          <Link href="/login">
            <Button variant="premium" size="pill-lg" className="w-full">
              Retour à la connexion
            </Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center px-5 safe-pb safe-pt">
      <h1 className="sr-only">Mot de passe oublié</h1>
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="glass-premium rounded-3xl p-7 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-light)] to-[var(--primary-dark)] flex items-center justify-center mx-auto mb-4 shadow-[var(--shadow-glow)]"
            >
              <Sparkles size={18} className="text-white" />
            </motion.div>
            <h2 className="text-[clamp(1.25rem,4vw,1.75rem)] font-bold text-[var(--text)] tracking-tight">Mot de passe oublié</h2>
            <p className="text-sm text-[var(--text-secondary)]">Reçois un lien pour en créer un nouveau</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="reset-email" className="text-xs font-medium text-[var(--text-secondary)] block tracking-wide">Email</label>
              <input id="reset-email" type="email" placeholder="ton@email.com" value={email}
                onChange={e => setEmail(e.target.value)} required
                className="w-full bg-[var(--bg-card)] text-[var(--text)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200
                  focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(217,45,74,0.12)]
                  placeholder:text-[var(--text-muted)]" />
            </div>
            {error && <p role="alert" className="text-sm text-[var(--error)] text-center">{error}</p>}

            {/* Turnstile */}
            <div className="flex justify-center">
              <div id="turnstile-widget" data-size="flexible" data-theme="dark" />
              {captchaFailed && (
                <p className="text-xs text-muted text-center">
                  Captcha non disponible — vérifie ta connexion ou désactive ton bloqueur de scripts
                </p>
              )}
            </div>

            <Button type="submit" variant="premium" size="pill-lg" loading={loading} className="w-full">
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </Button>
          </form>

          <div className="divider-gradient" />
          <Link href="/login" className="block text-center text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors duration-200">
            <span className="text-[var(--primary)] font-medium">Retour</span> à la connexion
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
