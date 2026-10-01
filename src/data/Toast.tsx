import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type Tipo = 'ok' | 'erro'
interface Aviso {
  id: number
  texto: string
  tipo: Tipo
}

const ToastCtx = createContext<(texto: string, tipo?: Tipo) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const mostrar = useCallback((texto: string, tipo: Tipo = 'ok') => {
    window.clearTimeout(timer.current)
    setAviso({ id: Date.now(), texto, tipo })
    timer.current = window.setTimeout(() => setAviso(null), tipo === 'erro' ? 4500 : 1800)
  }, [])

  return (
    <ToastCtx.Provider value={mostrar}>
      {children}
      <div className="toast-area" role="status" aria-live="polite">
        {aviso && (
          <div key={aviso.id} className={`toast ${aviso.tipo === 'erro' ? 'toast--erro' : ''}`}>
            {aviso.texto}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
