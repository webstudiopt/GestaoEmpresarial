// Carrega todas as tabelas da usuária ao entrar e mantém em memória.
// Cada gravação vai ao Supabase e, se der certo, atualiza o estado local
// com a linha devolvida pelo banco. Sempre mostra "Salvo" ou o motivo do erro.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { motivoErro, supabase } from '../lib/supabase'
import {
  CONFIG_PADRAO,
  type Atendimento,
  type Cliente,
  type Config,
  type Custo,
  type Historico,
  type Reserva,
  type ReservaObjetivo,
  type Servico,
} from '../lib/types'
import { useToast } from './Toast'

interface Tabelas {
  servicos: Servico
  custos: Custo
  atendimentos: Atendimento
  clientes: Cliente
  reservas: ReservaObjetivo
  reserva: Reserva
  historico: Historico
}
export type NomeTabela = keyof Tabelas

type Listas = { [K in NomeTabela]: Tabelas[K][] }

const ORDEM: { [K in NomeTabela]: (a: Tabelas[K], b: Tabelas[K]) => number } = {
  servicos: (a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'),
  custos: (a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'),
  atendimentos: (a, b) => b.data.localeCompare(a.data) || b.criado_em.localeCompare(a.criado_em),
  clientes: (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
  reservas: (a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'),
  reserva: (a, b) => b.data.localeCompare(a.data),
  historico: (a, b) => a.mes.localeCompare(b.mes),
}

// Postgres numeric pode chegar como texto dependendo da versão; normaliza.
const NUMERICOS: Partial<Record<NomeTabela, string[]>> = {
  servicos: ['preco', 'minutos', 'material', 'ordem'],
  custos: ['valor', 'ordem'],
  atendimentos: ['valor', 'minutos', 'material', 'taxa_repassada'],
  reservas: ['meta', 'ordem'],
  reserva: ['valor'],
  historico: ['total'],
}
function normalizar<K extends NomeTabela>(t: K, row: Tabelas[K]): Tabelas[K] {
  const campos = NUMERICOS[t]
  if (!campos) return row
  const r = { ...row } as Record<string, unknown>
  for (const c of campos) r[c] = Number(r[c]) || 0
  return r as unknown as Tabelas[K]
}
function normalizarConfig(c: Config): Config {
  return {
    ...c,
    imposto: Number(c.imposto) || 0,
    taxa_cartao: Number(c.taxa_cartao) || 0,
    horas_mes: Number(c.horas_mes) || 0,
    lucro_alvo: Number(c.lucro_alvo) || 0,
    meta_mes: Number(c.meta_mes) || 0,
    meta_reserva: Number(c.meta_reserva) || 0,
    licenca: c.licenca ?? '',
    politicas: c.politicas ?? '',
  }
}

interface DadosApi extends Listas {
  config: Config
  /** aviso vazio ('') grava sem mostrar aviso de sucesso */
  inserir: <K extends NomeTabela>(t: K, row: Partial<Tabelas[K]>, aviso?: string) => Promise<Tabelas[K] | null>
  /** grava várias linhas de uma vez (todas ou nenhuma); devolve as linhas gravadas, ou null se falhar */
  inserirVarios: <K extends NomeTabela>(t: K, rows: Partial<Tabelas[K]>[], aviso: string) => Promise<Tabelas[K][] | null>
  atualizar: <K extends NomeTabela>(t: K, id: string, patch: Partial<Tabelas[K]>, aviso?: string) => Promise<boolean>
  excluir: (t: NomeTabela, id: string) => Promise<boolean>
  salvarConfig: (patch: Partial<Config>) => Promise<boolean>
  recarregar: () => void
}

const Ctx = createContext<DadosApi | null>(null)

export function useDados() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useDados fora do DadosProvider')
  return v
}

const VAZIO: Listas = {
  servicos: [],
  custos: [],
  atendimentos: [],
  clientes: [],
  reservas: [],
  reserva: [],
  historico: [],
}

export function DadosProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const toast = useToast()
  const [listas, setListas] = useState<Listas>(VAZIO)
  const [config, setConfig] = useState<Config | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let ativo = true
    setErro(null)
    ;(async () => {
      try {
        const nomes = Object.keys(VAZIO) as NomeTabela[]
        const res = await Promise.all(nomes.map((t) => supabase.from(t).select('*')))
        const falha = res.find((r) => r.error)
        if (falha?.error) throw falha.error

        let { data: cfg, error: errCfg } = await supabase.from('config').select('*').maybeSingle()
        if (errCfg) throw errCfg
        if (!cfg) {
          // Primeira vez sem seed: cria a linha com os valores padrão.
          const novo = await supabase.from('config').insert({ ...CONFIG_PADRAO }).select().single()
          if (novo.error) throw novo.error
          cfg = novo.data
        }
        if (!ativo) return
        const l = { ...VAZIO } as Record<NomeTabela, unknown[]>
        nomes.forEach((t, i) => {
          const linhas = (res[i].data ?? []).map((r) => normalizar(t, r as never))
          l[t] = linhas.sort(ORDEM[t] as (a: unknown, b: unknown) => number)
        })
        setListas(l as Listas)
        setConfig(normalizarConfig(cfg as Config))
      } catch (e) {
        if (ativo) setErro(motivoErro(e))
      }
    })()
    return () => {
      ativo = false
    }
  }, [userId, tentativa])

  // Ao voltar para o app (outra aba, outro app no celular), busca os dados de novo.
  // Assim o que foi lançado por fora (SQL, outro aparelho) aparece sem recarregar.
  useEffect(() => {
    let ultima = Date.now()
    const voltar = () => {
      if (document.visibilityState !== 'visible' || Date.now() - ultima < 30_000) return
      ultima = Date.now()
      setTentativa((n) => n + 1)
    }
    document.addEventListener('visibilitychange', voltar)
    return () => document.removeEventListener('visibilitychange', voltar)
  }, [])

  const trocar = useCallback(<K extends NomeTabela>(t: K, f: (lista: Tabelas[K][]) => Tabelas[K][]) => {
    setListas((prev) => ({ ...prev, [t]: f(prev[t] as Tabelas[K][]).sort(ORDEM[t]) }))
  }, [])

  const inserir = useCallback<DadosApi['inserir']>(
    async (t, row, aviso = 'Salvo') => {
      const { data, error } = await supabase.from(t).insert(row as never).select().single()
      if (error) {
        toast('Não salvou: ' + motivoErro(error), 'erro')
        return null
      }
      const linha = normalizar(t, data as never)
      trocar(t, (l) => [...l, linha])
      if (aviso) toast(aviso)
      return linha
    },
    [toast, trocar],
  )

  // Várias linhas numa gravação só: entram todas ou nenhuma.
  const inserirVarios = useCallback<DadosApi['inserirVarios']>(
    async (t, rows, aviso) => {
      if (!rows.length) return []
      const { data, error } = await supabase.from(t).insert(rows as never).select()
      if (error) {
        toast('Não salvou: ' + motivoErro(error), 'erro')
        return null
      }
      const linhas = (data ?? []).map((r) => normalizar(t, r as never))
      trocar(t, (l) => [...l, ...linhas])
      if (aviso) toast(aviso)
      return linhas
    },
    [toast, trocar],
  )

  const atualizar = useCallback<DadosApi['atualizar']>(
    async (t, id, patch, aviso = 'Salvo') => {
      const { data, error } = await supabase.from(t).update(patch as never).eq('id', id).select().single()
      if (error) {
        toast('Não salvou: ' + motivoErro(error), 'erro')
        return false
      }
      const linha = normalizar(t, data as never)
      trocar(t, (l) => l.map((x) => (x.id === id ? linha : x)))
      toast(aviso)
      return true
    },
    [toast, trocar],
  )

  const excluir = useCallback<DadosApi['excluir']>(
    async (t, id) => {
      const { error } = await supabase.from(t).delete().eq('id', id)
      if (error) {
        toast('Não excluiu: ' + motivoErro(error), 'erro')
        return false
      }
      trocar(t, (l) => l.filter((x) => x.id !== id))
      // Atendimentos perdem o vínculo quando o serviço some (on delete set null).
      // Os lançamentos de uma reserva somem junto com ela (on delete cascade).
      if (t === 'reservas') trocar('reserva', (l) => l.filter((x) => x.reserva_id !== id))
      if (t === 'servicos')
        trocar('atendimentos', (l) => l.map((a) => (a.servico_id === id ? { ...a, servico_id: null } : a)))
      toast('Excluído')
      return true
    },
    [toast, trocar],
  )

  const salvarConfig = useCallback<DadosApi['salvarConfig']>(
    async (patch) => {
      const { data, error } = await supabase.from('config').update(patch).eq('user_id', userId).select().single()
      if (error) {
        toast('Não salvou: ' + motivoErro(error), 'erro')
        return false
      }
      setConfig(normalizarConfig(data as Config))
      toast('Salvo')
      return true
    },
    [toast, userId],
  )

  const api = useMemo<DadosApi | null>(
    () =>
      config && {
        ...listas,
        config,
        inserir,
        inserirVarios,
        atualizar,
        excluir,
        salvarConfig,
        recarregar: () => setTentativa((n) => n + 1),
      },
    [listas, config, inserir, inserirVarios, atualizar, excluir, salvarConfig],
  )

  if (erro)
    return (
      <div className="tela-cheia">
        <p>Não consegui carregar os dados: {erro}.</p>
        <button className="btn" type="button" onClick={() => setTentativa((n) => n + 1)}>
          Tentar de novo
        </button>
      </div>
    )
  if (!api)
    return (
      <div className="tela-cheia">
        <p className="muted">Carregando…</p>
      </div>
    )
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
