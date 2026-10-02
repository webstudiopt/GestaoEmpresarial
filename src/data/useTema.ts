import { useCallback, useEffect, useState } from 'react'

export type PreferenciaTema = 'auto' | 'claro' | 'escuro'

const CHAVE = 'andrade-tema'
const ROTULO: Record<PreferenciaTema, string> = { auto: 'Automático', claro: 'Claro', escuro: 'Escuro' }
const CURTO: Record<PreferenciaTema, string> = { auto: 'Tema auto', claro: 'Tema claro', escuro: 'Tema escuro' }
const PROXIMO: Record<PreferenciaTema, PreferenciaTema> = { auto: 'claro', claro: 'escuro', escuro: 'auto' }

function lerPreferencia(): PreferenciaTema {
  try {
    const v = localStorage.getItem(CHAVE)
    return v === 'claro' || v === 'escuro' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

/** Grava data-theme no <html>; "auto" tira o atributo e vale a preferência do sistema. */
function aplicar(p: PreferenciaTema) {
  const raiz = document.documentElement
  if (p === 'auto') delete raiz.dataset.theme
  else raiz.dataset.theme = p === 'escuro' ? 'dark' : 'light'
}

const sistemaEscuro = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false

/** Tema do app: automático (segue o sistema), claro ou escuro. */
export function useTema() {
  const [preferencia, setPreferencia] = useState<PreferenciaTema>(lerPreferencia)
  const [escuroSistema, setEscuroSistema] = useState(sistemaEscuro)

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const mudou = () => setEscuroSistema(mq.matches)
    mq.addEventListener('change', mudou)
    return () => mq.removeEventListener('change', mudou)
  }, [])

  // Outra tela (ou o cabeçalho) trocou o tema: mantém todos em sincronia.
  useEffect(() => {
    const ouvir = () => setPreferencia(lerPreferencia())
    window.addEventListener('andrade-tema', ouvir)
    return () => window.removeEventListener('andrade-tema', ouvir)
  }, [])

  const alternar = useCallback(() => {
    const nova = PROXIMO[lerPreferencia()]
    try {
      if (nova === 'auto') localStorage.removeItem(CHAVE)
      else localStorage.setItem(CHAVE, nova)
    } catch {
      /* sem armazenamento: vale só nesta visita */
    }
    aplicar(nova)
    setPreferencia(nova)
    window.dispatchEvent(new Event('andrade-tema'))
  }, [])

  const escuro = preferencia === 'escuro' || (preferencia === 'auto' && escuroSistema)
  return { preferencia, rotulo: ROTULO[preferencia], curto: CURTO[preferencia], escuro, alternar }
}
