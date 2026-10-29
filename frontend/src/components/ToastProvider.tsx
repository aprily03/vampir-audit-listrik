import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

interface ToastContextValue {
  push: (kind: ToastKind, message: string) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++counter.current
      setToasts((current) => [...current, { id, kind, message }])
      window.setTimeout(() => remove(id), 4800)
    },
    [remove],
  )

  const value = {
    push,
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div className={`toast toast-${toast.kind}`} key={toast.id}>
            <span className="toast-icon">
              {toast.kind === 'success' && <CheckCircle2 size={17} />}
              {toast.kind === 'error' && <TriangleAlert size={17} />}
              {toast.kind === 'info' && <Info size={17} />}
            </span>
            <span>{toast.message}</span>
            <button className="toast-close" onClick={() => remove(toast.id)} aria-label="Tutup notifikasi">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast harus dipakai di dalam ToastProvider.')
  return context
}
