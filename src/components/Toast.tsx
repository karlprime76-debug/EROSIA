'use client'

import { createContext, useContext, useCallback, type ReactNode } from 'react'
import { toast as sonnerToast } from 'sonner'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const toast = useCallback((message: string, type: ToastType = 'info') => {
    switch (type) {
      case 'success':
        sonnerToast.success(message)
        break
      case 'error':
        sonnerToast.error(message)
        break
      case 'warning':
        sonnerToast.warning(message, { icon: <span>⚠️</span> })
        break
      default:
        sonnerToast(message)
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
    </ToastContext.Provider>
  )
}
