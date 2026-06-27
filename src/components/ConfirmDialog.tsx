'use client'

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'

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
      <AnimatePresence>
        {state && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-6 backdrop-blur-sm"
            onClick={() => handle(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="glass rounded-2xl p-6 max-w-sm w-full text-center"
              onClick={e => e.stopPropagation()}
            >
              <p className="text-sm text-[#F5F0EB] mb-6 leading-relaxed">{state.message}</p>
              <div className="flex gap-3">
                <button onClick={() => handle(false)}
                  className="flex-1 py-2.5 rounded-full text-sm font-medium border border-[#2C2A28] text-[#A09890] hover:bg-[#222225] transition-all duration-200">
                  Annuler
                </button>
                <button onClick={() => handle(true)}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white shadow-[0_4px_16px_rgba(217,45,74,0.25)] hover:shadow-[0_6px_24px_rgba(217,45,74,0.35)] transition-all duration-200"
                  style={{ background: '#D92D4A' }}>
                  Confirmer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  )
}
