import { useCallback, useEffect, useState } from 'react'
import type { EventoAgenda } from '../lib/agendaGoogle'
import {
  carregarGoogle,
  conectarGoogle,
  desconectarGoogle,
  ErroGoogle,
  googleConfigurado,
  listarAgendas,
  listarEventos,
  tokenSalvo,
  type AgendaGoogle,
} from '../lib/google'

const CHAVE_AGENDA = 'andrade-google-agenda'
const CHAVE_AUTORIZOU = 'andrade-google-autorizou'

const ler = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const gravar = (k: string, v: string | null) => {
  try {
    if (v == null) localStorage.removeItem(k)
    else localStorage.setItem(k, v)
  } catch {
    /* sem armazenamento */
  }
}

export type EstadoGoogle = 'desligado' | 'desconectado' | 'expirado' | 'conectado'

/** Conexão com a Google Agenda e eventos do mês escolhido. */
export function useAgendaGoogle(mes: string) {
  const [token, setToken] = useState<string | null>(tokenSalvo)
  const [autorizou, setAutorizou] = useState(() => ler(CHAVE_AUTORIZOU) === '1')
  const [agendas, setAgendas] = useState<AgendaGoogle[]>([])
  const [agendaId, setAgendaIdState] = useState(() => ler(CHAVE_AGENDA) ?? 'primary')
  const [eventos, setEventos] = useState<EventoAgenda[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)

  // Deixa o script do Google pronto antes do toque em "Conectar".
  useEffect(() => {
    if (googleConfigurado) carregarGoogle().catch(() => {})
  }, [])

  const tratarErro = useCallback((e: unknown) => {
    if (e instanceof ErroGoogle && e.expirou) setToken(null)
    setErro(e instanceof Error ? e.message : String(e))
  }, [])

  useEffect(() => {
    if (!token) return
    let ativo = true
    listarAgendas(token)
      .then((l) => ativo && setAgendas(l))
      .catch((e) => ativo && tratarErro(e))
    return () => {
      ativo = false
    }
  }, [token, tratarErro])

  useEffect(() => {
    if (!token) {
      setEventos([])
      return
    }
    let ativo = true
    setCarregando(true)
    setErro(null)
    listarEventos(token, agendaId, mes)
      .then((l) => ativo && setEventos(l))
      .catch((e) => ativo && tratarErro(e))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [token, agendaId, mes, versao, tratarErro])

  const conectar = useCallback(async () => {
    setErro(null)
    try {
      await carregarGoogle()
      const t = await conectarGoogle(autorizou)
      gravar(CHAVE_AUTORIZOU, '1')
      setAutorizou(true)
      setToken(t)
    } catch (e) {
      tratarErro(e)
    }
  }, [autorizou, tratarErro])

  const desconectar = useCallback(() => {
    desconectarGoogle()
    gravar(CHAVE_AUTORIZOU, null)
    setAutorizou(false)
    setToken(null)
    setAgendas([])
    setErro(null)
  }, [])

  const setAgendaId = useCallback((id: string) => {
    gravar(CHAVE_AGENDA, id)
    setAgendaIdState(id)
  }, [])

  const estado: EstadoGoogle = !googleConfigurado
    ? 'desligado'
    : token
      ? 'conectado'
      : autorizou
        ? 'expirado'
        : 'desconectado'

  return {
    estado,
    agendas,
    agendaId,
    setAgendaId,
    eventos,
    carregando,
    erro,
    conectar,
    desconectar,
    atualizar: () => setVersao((v) => v + 1),
  }
}
