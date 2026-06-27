'use client'

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'

interface ConfirmContextValue {
  confirm: (message: string) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue>({
  confirm: () => Promise.resolve(false),
})

export const useConfirm = () => useContext(ConfirmContext)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null)

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>(resolve => {
      setState({ message, resolve })
    })
  }, [])

  useEffect(() => {
    if (!state) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        state.resolve(false)
        setState(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [state])

  const handle = (value: boolean) => {
    state?.resolve(value)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-6 backdrop-blur-sm" onClick={() => handle(false)}>
          <div className="glass-card rounded-2xl p-6 max-w-sm w-full text-center animate-scale-in" onClick={e => e.stopPropagation()}>
            <p className="text-sm text-[#F5F0EB] mb-6">{state.message}</p>
            <div className="flex gap-3">
              <button onClick={() => handle(false)} className="flex-1 py-2.5 rounded-full text-sm font-medium border border-[#2A2826] text-[#9E9488]">
                Annuler
              </button>
              <button onClick={() => handle(true)} className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white" style={{ background: '#D92D4A' }}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
