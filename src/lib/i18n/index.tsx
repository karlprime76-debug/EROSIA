'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Locale, TranslationKey, Translations } from './types'
import fr from './fr'
import en from './en'

const locales: Record<Locale, Translations> = { fr, en }

function getTranslations(locale: Locale): Translations {
  return locales[locale] || locales.fr
}

async function saveLocale(locale: Locale): Promise<void> {
  localStorage.setItem('erosia-locale', locale)
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase.from('profiles').update({ language: locale }).eq('id', user.id)
  }
}

async function getSavedLocale(): Promise<Locale> {
  const saved = localStorage.getItem('erosia-locale') as Locale | null
  if (saved) return saved
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data } = await supabase.from('profiles').select('language').eq('id', user.id).maybeSingle()
    if (data?.language === 'en' || data?.language === 'fr') return data.language
  }
  return 'fr'
}

interface LocaleContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: TranslationKey) => string
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'fr',
  setLocale: () => {},
  t: (key: TranslationKey) => key,
})

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr')

  useEffect(() => {
    getSavedLocale().then(setLocaleState)
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    saveLocale(l)
  }, [])

  const translate = useCallback((key: TranslationKey) => {
    return getTranslations(locale)[key] || key
  }, [locale])

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translate }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
