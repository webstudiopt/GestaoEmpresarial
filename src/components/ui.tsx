import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { SELO_TEXTO, type Selo } from '../lib/calc'
import { lerNumero, numeroParaCampo } from '../lib/format'

/** Botão de excluir que pede confirmação no próprio lugar (sem confirm()). */
export function ConfirmButton({
  onConfirm,
  rotulo = 'Excluir',
  pergunta = 'Excluir?',
  descricao,
}: {
  onConfirm: () => void | Promise<unknown>
  rotulo?: string
  pergunta?: string
  /** texto para leitores de tela, ex.: "Excluir atendimento de Ana" */
  descricao?: string
}) {
  const [aberto, setAberto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const simRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!aberto) return
    simRef.current?.focus()
    const t = window.setTimeout(() => setAberto(false), 6000)
    return () => window.clearTimeout(t)
  }, [aberto])

  if (!aberto)
    return (
      <button type="button" className="btn btn--perigo btn--pequeno" aria-label={descricao} onClick={() => setAberto(true)}>
        {rotulo}
      </button>
    )
  return (
    <span className="confirmar" role="group" aria-label={pergunta}>
      <span className="confirmar__p">{pergunta}</span>
      <button
        ref={simRef}
        type="button"
        className="btn btn--perigo-cheio btn--pequeno"
        disabled={ocupado}
        onClick={async () => {
          setOcupado(true)
          await onConfirm()
          setOcupado(false)
          setAberto(false)
        }}
      >
        Sim
      </button>
      <button type="button" className="btn btn--fantasma btn--pequeno" onClick={() => setAberto(false)}>
        Não
      </button>
    </span>
  )
}

type NumeroProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number | null
  /** chamado a cada tecla com o número lido (para recalcular na hora) */
  onValor?: (v: number | null) => void
  /** chamado ao sair do campo, só se o valor mudou; devolver false desfaz */
  onSalvar?: (v: number) => unknown
  casas?: number
}

/**
 * Campo numérico que aceita vírgula ("98,70") e abre o teclado decimal no iPhone.
 * Mantém o texto digitado enquanto está em foco.
 */
export function NumeroInput({ value, onValor, onSalvar, casas = 2, onBlur, onFocus, ...rest }: NumeroProps) {
  const [texto, setTexto] = useState(numeroParaCampo(value, casas))
  const focado = useRef(false)

  useEffect(() => {
    if (!focado.current) setTexto(numeroParaCampo(value, casas))
  }, [value, casas])

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={texto}
      onFocus={(e) => {
        focado.current = true
        onFocus?.(e)
      }}
      onChange={(e) => {
        setTexto(e.target.value)
        onValor?.(lerNumero(e.target.value))
      }}
      onBlur={(e) => {
        focado.current = false
        const v = lerNumero(texto) ?? 0
        setTexto(numeroParaCampo(v, casas))
        if (onSalvar && Math.abs(v - (value ?? 0)) > 1e-9)
          Promise.resolve(onSalvar(v)).then((ok) => {
            if (ok === false && !focado.current) setTexto(numeroParaCampo(value, casas))
          })
        onBlur?.(e)
      }}
    />
  )
}

/** Campo de texto que salva ao sair, só se mudou. */
export function TextoInput({
  value,
  onSalvar,
  onValor,
  multilinha,
  ...rest
}: {
  value: string
  /** devolver false desfaz o texto */
  onSalvar: (v: string) => unknown
  onValor?: (v: string) => void
  multilinha?: boolean
  id?: string
  placeholder?: string
  rows?: number
  'aria-label'?: string
  required?: boolean
}) {
  const [texto, setTexto] = useState(value)
  const focado = useRef(false)
  useEffect(() => {
    if (!focado.current) setTexto(value)
  }, [value])
  const props = {
    ...rest,
    value: texto,
    onFocus: () => {
      focado.current = true
    },
    onChange: (e: { target: { value: string } }) => {
      setTexto(e.target.value)
      onValor?.(e.target.value)
    },
    onBlur: () => {
      focado.current = false
      if (texto !== value)
        Promise.resolve(onSalvar(texto)).then((ok) => {
          if (ok === false && !focado.current) setTexto(value)
        })
    },
  }
  return multilinha ? <textarea {...props} /> : <input {...props} type="text" />
}

export function Kpi({ rotulo, valor, sub }: { rotulo: string; valor: string; sub?: ReactNode }) {
  return (
    <div className="kpi">
      <div className="kpi__r">{rotulo}</div>
      <div className="kpi__v num">{valor}</div>
      {sub && <div className="kpi__s">{sub}</div>}
    </div>
  )
}

export function Barra({ valor, rotulo }: { valor: number; rotulo: string }) {
  const p = Math.max(0, Math.min(1, valor))
  return (
    <div
      className="barra"
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
    >
      <i style={{ width: `${p * 100}%` }} />
    </div>
  )
}

export function SeloSituacao({ selo }: { selo: Selo }) {
  return <span className={`selo selo--${selo}`}>{SELO_TEXTO[selo]}</span>
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="vazio">{children}</div>
}
