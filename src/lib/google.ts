// Acesso de leitura à Google Agenda direto do navegador (Google Identity Services).
// O token vale ~1 hora; depois disso ela toca em "Reconectar". Nada passa pelo Supabase.

import { eventoDaApi, type EventoAgenda } from './agendaGoogle'
import { somarMeses } from './format'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const ESCOPO = 'https://www.googleapis.com/auth/calendar.readonly'
const CHAVE_TOKEN = 'andrade-google-token'
const API = 'https://www.googleapis.com/calendar/v3'

export const googleConfigurado = Boolean(CLIENT_ID)

interface RespostaToken {
  access_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}
interface TokenClient {
  requestAccessToken: (o?: { prompt?: string }) => void
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (c: {
            client_id: string
            scope: string
            callback: (r: RespostaToken) => void
            error_callback?: (e: { type: string; message?: string }) => void
          }) => TokenClient
          revoke: (token: string, done?: () => void) => void
        }
      }
    }
  }
}

export class ErroGoogle extends Error {
  constructor(
    message: string,
    readonly expirou = false,
  ) {
    super(message)
  }
}

let carregando: Promise<void> | null = null

/** Baixa o script do Google. Chame cedo: no iPhone o popup precisa sair do toque, sem espera. */
export function carregarGoogle(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  carregando ??= new Promise<void>((ok, falha) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => ok()
    s.onerror = () => {
      carregando = null
      falha(new ErroGoogle('não consegui carregar o Google (sem internet?)'))
    }
    document.head.appendChild(s)
  })
  return carregando
}

export function tokenSalvo(): string | null {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_TOKEN) ?? 'null') as { token: string; expira: number } | null
    return salvo && salvo.expira > Date.now() ? salvo.token : null
  } catch {
    return null
  }
}

function salvarToken(token: string, segundos: number) {
  try {
    // Margem de 1 min para não usar um token prestes a vencer.
    localStorage.setItem(CHAVE_TOKEN, JSON.stringify({ token, expira: Date.now() + (segundos - 60) * 1000 }))
  } catch {
    /* sem armazenamento: o token vale só nesta tela */
  }
}

/** Abre a janela do Google para autorizar a leitura da agenda. Chamar a partir de um toque. */
export function conectarGoogle(jaAutorizou: boolean): Promise<string> {
  if (!CLIENT_ID) return Promise.reject(new ErroGoogle('falta configurar VITE_GOOGLE_CLIENT_ID'))
  const g = window.google
  if (!g) return Promise.reject(new ErroGoogle('o Google ainda está carregando, tente de novo'))
  return new Promise((ok, falha) => {
    const cliente = g.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: ESCOPO,
      callback: (r) => {
        if (r.error || !r.access_token) return falha(new ErroGoogle(r.error_description || r.error || 'sem autorização'))
        salvarToken(r.access_token, r.expires_in ?? 3600)
        ok(r.access_token)
      },
      error_callback: (e) =>
        falha(new ErroGoogle(e.type === 'popup_closed' ? 'janela do Google fechada' : e.message || e.type)),
    })
    // Quem já autorizou antes não precisa ver a tela de consentimento de novo.
    cliente.requestAccessToken({ prompt: jaAutorizou ? '' : 'consent' })
  })
}

export function desconectarGoogle() {
  const token = tokenSalvo()
  try {
    localStorage.removeItem(CHAVE_TOKEN)
  } catch {
    /* nada */
  }
  if (token) window.google?.accounts.oauth2.revoke(token)
}

async function chamar<T>(token: string, caminho: string): Promise<T> {
  let r: Response
  try {
    r = await fetch(API + caminho, { headers: { Authorization: `Bearer ${token}` } })
  } catch {
    throw new ErroGoogle('sem conexão com o Google')
  }
  if (r.status === 401) {
    try {
      localStorage.removeItem(CHAVE_TOKEN)
    } catch {
      /* nada */
    }
    throw new ErroGoogle('a conexão com o Google expirou', true)
  }
  if (!r.ok) throw new ErroGoogle(`o Google respondeu ${r.status}`)
  return r.json() as Promise<T>
}

export interface AgendaGoogle {
  id: string
  nome: string
  principal: boolean
}

export async function listarAgendas(token: string): Promise<AgendaGoogle[]> {
  const r = await chamar<{ items?: { id: string; summary: string; primary?: boolean }[] }>(
    token,
    '/users/me/calendarList?minAccessRole=reader',
  )
  return (r.items ?? [])
    .map((c) => ({ id: c.id, nome: c.summary, principal: Boolean(c.primary) }))
    .sort((a, b) => Number(b.principal) - Number(a.principal) || a.nome.localeCompare(b.nome, 'pt-BR'))
}

/** Eventos com horário do mês `ym` (YYYY-MM), em ordem. */
export async function listarEventos(token: string, agendaId: string, ym: string): Promise<EventoAgenda[]> {
  const [a, m] = ym.split('-').map(Number)
  const [a2, m2] = somarMeses(ym, 1).split('-').map(Number)
  const params = new URLSearchParams({
    timeMin: new Date(a, m - 1, 1).toISOString(),
    timeMax: new Date(a2, m2 - 1, 1).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '500',
    fields: 'items(id,summary,status,start)',
  })
  const r = await chamar<{ items?: Parameters<typeof eventoDaApi>[0][] }>(
    token,
    `/calendars/${encodeURIComponent(agendaId)}/events?${params}`,
  )
  return (r.items ?? []).map(eventoDaApi).filter((e): e is EventoAgenda => e !== null)
}
