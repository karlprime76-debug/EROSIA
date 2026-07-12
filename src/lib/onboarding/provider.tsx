'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

interface OnboardingState {
  step: number
  completedSteps: number[]
  userId: string | null
  profileData: {
    photos: string[]
    bio: string
    interests: string[]
    looking_for: string
    gender: string | null
    age: number | null
    preferences_set: boolean
    distance_set: boolean
    email_verified: boolean
    identity_verified: boolean
    notifications_enabled: boolean
  }
  completionPercentage: number
  isLoaded: boolean
}

interface OnboardingContextValue extends OnboardingState {
  setStep: (step: number) => void
  markStepCompleted: (step: number) => void
  resume: () => void
  updateProfileData: (data: Partial<OnboardingState['profileData']>) => void
  getMissingInfo: () => MissingInfoItem[]
  completeOnboardingFlow: () => Promise<void>
}

export interface MissingInfoItem {
  id: string
  label: string
  step: number
}

const TOTAL_STEPS = 11

function calculateCompletion(profile: OnboardingState['profileData']): number {
  let score = 0

  if (profile.photos.length >= 3) score += 25
  else if (profile.photos.length >= 1) score += 10

  if (profile.bio.length > 100) score += 15
  else if (profile.bio.length > 0) score += 10

  if (profile.interests.length >= 3) score += 15

  if (profile.looking_for) score += 5

  if (profile.gender && profile.age) score += 5

  if (profile.preferences_set) score += 5

  if (profile.distance_set) score += 5

  if (profile.email_verified) score += 10

  if (profile.identity_verified) score += 10

  if (profile.notifications_enabled) score += 5

  return Math.min(100, score)
}

const defaultProfileData: OnboardingState['profileData'] = {
  photos: [],
  bio: '',
  interests: [],
  looking_for: 'serious',
  gender: null,
  age: null,
  preferences_set: false,
  distance_set: false,
  email_verified: false,
  identity_verified: false,
  notifications_enabled: false,
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider')
  return ctx
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>({
    step: 0,
    completedSteps: [],
    userId: null,
    profileData: { ...defaultProfileData },
    completionPercentage: 0,
    isLoaded: false,
  })

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setState(prev => ({ ...prev, isLoaded: true }))
          return
        }

        const savedStep = typeof window !== 'undefined'
          ? Number(localStorage.getItem('onboarding_step') || '0')
          : 0

        const { data: profile } = await supabase
          .from('profiles')
          .select('photos, bio, interests, looking_for, gender, age, onboarding_step, is_verified, verification_status')
          .eq('id', user.id)
          .maybeSingle()

        const emailVerified = user.email_confirmed_at != null

        const profileData: OnboardingState['profileData'] = {
          photos: profile?.photos ?? [],
          bio: profile?.bio ?? '',
          interests: profile?.interests ?? [],
          looking_for: profile?.looking_for ?? 'serious',
          gender: profile?.gender ?? null,
          age: profile?.age ?? null,
          preferences_set: !!(profile?.looking_for),
          distance_set: false,
          email_verified: emailVerified,
          identity_verified: profile?.is_verified ?? false,
          notifications_enabled: typeof Notification !== 'undefined' && Notification.permission === 'granted',
        }

        const dbStep = profile?.onboarding_step ?? 0
        const finalStep = Math.max(savedStep, dbStep)

        setState({
          step: finalStep,
          completedSteps: Array.from({ length: finalStep }, (_, i) => i),
          userId: user.id,
          profileData,
          completionPercentage: calculateCompletion(profileData),
          isLoaded: true,
        })
      } catch (err) {
        logger.error('OnboardingProvider load error', { error: String(err) })
        setState(prev => ({ ...prev, isLoaded: true }))
      }
    }

    load()
  }, [])

  useEffect(() => {
    if (!state.isLoaded) return
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_step', String(state.step))
    }
    if (state.userId) {
      supabase
        .from('profiles')
        .update({ onboarding_step: state.step })
        .eq('id', state.userId)
        .then(({ error }) => {
          if (error) logger.error('Failed to persist onboarding_step', { error: error.message })
        })
    }
  }, [state.step, state.userId, state.isLoaded])

  const completionPercentage = useMemo(() => calculateCompletion(state.profileData), [state.profileData])

  const setStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, step: Math.max(0, Math.min(step, TOTAL_STEPS - 1)) }))
  }, [])

  const markStepCompleted = useCallback((step: number) => {
    setState(prev => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(step)
        ? prev.completedSteps
        : [...prev.completedSteps, step],
    }))
  }, [])

  const resume = useCallback(() => {
    const savedStep = typeof window !== 'undefined'
      ? Number(localStorage.getItem('onboarding_step') || '0')
      : 0
    if (savedStep > 0 && savedStep < TOTAL_STEPS) {
      setState(prev => ({ ...prev, step: savedStep }))
    }
  }, [])

  const updateProfileData = useCallback((data: Partial<OnboardingState['profileData']>) => {
    setState(prev => ({
      ...prev,
      profileData: { ...prev.profileData, ...data },
    }))
  }, [])

  const getMissingInfo = useCallback((): MissingInfoItem[] => {
    const missing: MissingInfoItem[] = []
    const p = state.profileData

    if (p.photos.length < 3) {
      missing.push({ id: 'photos', label: p.photos.length === 0 ? 'Ajoute au moins 1 photo' : `Ajoute ${3 - p.photos.length} photo${3 - p.photos.length > 1 ? 's' : ''} supplémentaire${3 - p.photos.length > 1 ? 's' : ''}`, step: 2 })
    }
    if (!p.bio) {
      missing.push({ id: 'bio', label: 'Écris une bio', step: 4 })
    } else if (p.bio.length <= 100) {
      missing.push({ id: 'bio', label: 'Enrichis ta bio (100+ caractères)', step: 4 })
    }
    if (p.interests.length < 3) {
      missing.push({ id: 'interests', label: `Ajoute ${3 - p.interests.length} centre${3 - p.interests.length > 1 ? 's' : ''} d'intérêt`, step: 5 })
    }
    if (!p.preferences_set) {
      missing.push({ id: 'preferences', label: 'Définis tes préférences de recherche', step: 6 })
    }
    if (!p.distance_set) {
      missing.push({ id: 'distance', label: 'Définis ta distance maximale', step: 7 })
    }
    if (!p.email_verified) {
      missing.push({ id: 'email', label: 'Vérifie ton adresse email', step: 8 })
    }
    if (!p.identity_verified) {
      missing.push({ id: 'identity', label: 'Vérifie ton identité', step: 9 })
    }
    if (!p.notifications_enabled) {
      missing.push({ id: 'notifications', label: 'Active les notifications', step: 10 })
    }

    return missing
  }, [state.profileData])

  const completeOnboardingFlow = useCallback(async () => {
    if (state.userId) {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_complete: true })
        .eq('id', state.userId)
      if (error) logger.error('completeOnboarding error', { error: error.message })
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('onboarding_step')
    }
  }, [state.userId])

  return (
    <OnboardingContext.Provider value={{
      ...state,
      completionPercentage,
      setStep,
      markStepCompleted,
      resume,
      updateProfileData,
      getMissingInfo,
      completeOnboardingFlow,
    }}>
      {children}
    </OnboardingContext.Provider>
  )
}
