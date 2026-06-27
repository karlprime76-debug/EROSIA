'use client'

import { useState, useCallback, createContext, useContext, type ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export const useToast = () => useContext(ToastContext)

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle size={18} className="text-green-400" />,
  error: <AlertCircle size={18} className="text-red-400" />,
  warning: <AlertTriangle size={18} className="text-yellow-400" />,
  info: <Info size={18} className="text-blue-400" />,
}

const bgMap: Record<ToastType, string> = {
  success: 'border-green-500/20',
  error: 'border-red-500/20',
  warning: 'border-yellow-500/20',
  info: 'border-blue-500/20',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[90vw] max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1C1C1E] border ${bgMap[t.type]} shadow-lg shadow-black/40 animate-slide-up`}>
            {icons[t.type]}
            <p className="flex-1 text-sm text-[#F5F0EB]">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-[#6B6258] hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
