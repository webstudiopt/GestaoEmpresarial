// Contas do negócio. Funções puras: recebem dados, devolvem números.
// As fórmulas seguem a especificação ao pé da letra; ver calc.test.ts.

import type { Atendimento, Config, Custo, Historico, Reserva, Servico } from './types'

const n = (v: unknown) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

export type Selo = 'saudavel' | 'abaixo' | 'prejuizo'

export const SELO_TEXTO: Record<Selo, string> = {
  saudavel: 'Saudável',
  abaixo: 'Abaixo do mínimo',
  prejuizo: 'Dá prejuízo',
}

export type Parametros = Pick<Config, 'imposto' | 'taxa_cartao' | 'lucro_alvo' | 'horas_mes'>

/** fixos_total = soma de custos.valor */
export function fixosTotal(custos: Pick<Custo, 'valor'>[]) {
  return custos.reduce((a, c) => a + n(c.valor), 0)
}

/** hora_custo = fixos_total / horas_mes */
export function horaCusto(fixos: number, horas_mes: number) {
  return horas_mes > 0 ? fixos / horas_mes : 0
}

/** taxa_media = taxa_cartao * 0.15 (só ~15% das vendas passam no cartão) */
export function taxaMedia(taxa_cartao: number) {
  return n(taxa_cartao) * 0.15
}

export interface CalculoServico {
  horas: number
  custo_real: number
  minimo: number
  por_hora: number
  lucro: number
  margem: number
  selo: Selo
}

export function calcularServico(
  s: Pick<Servico, 'preco' | 'minutos' | 'material'>,
  p: Parametros,
  hora_custo: number,
): CalculoServico {
  const preco = n(s.preco)
  const imposto = n(p.imposto)
  const tm = taxaMedia(p.taxa_cartao)
  const horas = n(s.minutos) / 60
  const custo_real = horas * hora_custo + n(s.material)
  const divisor = 1 - imposto - tm - n(p.lucro_alvo)
  const minimo = divisor > 0 ? custo_real / divisor : Infinity
  const por_hora = horas > 0 ? preco / horas : 0
  const lucro = preco * (1 - imposto - tm) - custo_real
  const margem = preco > 0 ? lucro / preco : 0
  const selo: Selo =
    preco < custo_real / (1 - imposto) ? 'prejuizo' : preco < minimo ? 'abaixo' : 'saudavel'
  return { horas, custo_real, minimo, por_hora, lucro, margem, selo }
}

export interface ResultadoMes {
  faturamento: number
  quantidade: number
  imposto: number
  taxas: number
  material: number
  fixos: number
  sobra: number
  minutos: number
  /** null quando não há atendimentos */
  ticket: number | null
  /** faturamento ÷ horas trabalhadas; null sem minutos registrados */
  por_hora: number | null
}

export function resultadoMes(
  atendimentos: Pick<Atendimento, 'valor' | 'pagamento' | 'material' | 'minutos'>[],
  p: Pick<Config, 'imposto' | 'taxa_cartao'>,
  fixos: number,
): ResultadoMes {
  let faturamento = 0
  let cartao = 0
  let material = 0
  let minutos = 0
  for (const a of atendimentos) {
    faturamento += n(a.valor)
    if (a.pagamento === 'Crédito' || a.pagamento === 'Débito') cartao += n(a.valor)
    material += n(a.material)
    minutos += n(a.minutos)
  }
  const imposto = faturamento * n(p.imposto)
  const taxas = cartao * n(p.taxa_cartao)
  const quantidade = atendimentos.length
  return {
    faturamento,
    quantidade,
    imposto,
    taxas,
    material,
    fixos,
    sobra: faturamento - imposto - taxas - material - fixos,
    minutos,
    ticket: quantidade ? faturamento / quantidade : null,
    por_hora: minutos > 0 ? faturamento / (minutos / 60) : null,
  }
}

export interface ProgressoMeta {
  progresso: number // 0 a 1
  falta: number
  /** atendimentos que faltam no ticket informado */
  atendimentos: number
}

export function progressoMeta(faturamento: number, meta: number, ticket: number): ProgressoMeta {
  const falta = Math.max(0, n(meta) - faturamento)
  return {
    progresso: meta > 0 ? Math.min(1, faturamento / meta) : 1,
    falta,
    atendimentos: ticket > 0 ? Math.ceil(falta / ticket) : 0,
  }
}

export interface ItemMaisVendido {
  nome: string
  quantidade: number
  total: number
}

export function maisVendidos(atendimentos: Pick<Atendimento, 'servico_nome' | 'valor'>[]): ItemMaisVendido[] {
  const g = new Map<string, ItemMaisVendido>()
  for (const a of atendimentos) {
    const nome = a.servico_nome || 'Sem serviço'
    const item = g.get(nome) ?? { nome, quantidade: 0, total: 0 }
    item.quantidade++
    item.total += n(a.valor)
    g.set(nome, item)
  }
  return [...g.values()].sort((a, b) => b.total - a.total || b.quantidade - a.quantidade)
}

/** Os `quantos` meses terminando em `ym` (inclusive), do mais antigo para o mais novo. */
export function mesesAte(ym: string, quantos: number) {
  const [a, m] = ym.split('-').map(Number)
  const out: string[] = []
  for (let i = quantos - 1; i >= 0; i--) {
    const d = new Date(a, m - 1 - i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

export interface PontoFaturamento {
  mes: string
  total: number
  fonte: 'atendimentos' | 'historico' | 'vazio'
}

/**
 * Faturamento mês a mês. Mês com atendimentos registrados usa a soma deles;
 * mês sem atendimentos usa o histórico (meses anteriores ao app).
 */
export function serieFaturamento(
  ym: string,
  quantos: number,
  atendimentos: Pick<Atendimento, 'data' | 'valor'>[],
  historico: Pick<Historico, 'mes' | 'total'>[],
): PontoFaturamento[] {
  const porMes = new Map<string, number>()
  for (const a of atendimentos) {
    const k = a.data.slice(0, 7)
    porMes.set(k, (porMes.get(k) ?? 0) + n(a.valor))
  }
  const hist = new Map(historico.map((h) => [h.mes, n(h.total)]))
  return mesesAte(ym, quantos).map((mes) => {
    if (porMes.has(mes)) return { mes, total: porMes.get(mes)!, fonte: 'atendimentos' }
    if (hist.has(mes)) return { mes, total: hist.get(mes)!, fonte: 'historico' }
    return { mes, total: 0, fonte: 'vazio' }
  })
}

export interface ResumoReserva {
  total: number
  meta: number
  progresso: number
  falta: number
  /** dias corridos até a licença (negativo se já passou) */
  dias: number
  /** meses até a licença, no mínimo 1 */
  meses: number
  por_mes: number
  /** quantos meses de custos fixos a reserva paga */
  meses_cobertos: number
}

const diaUTC = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number)
  return Date.UTC(a, m - 1, d)
}

export function resumoReserva(
  lancamentos: Pick<Reserva, 'valor'>[],
  meta: number,
  licenca: string,
  hoje: string,
  fixos: number,
): ResumoReserva {
  const total = lancamentos.reduce((a, r) => a + n(r.valor), 0)
  const falta = Math.max(0, n(meta) - total)
  const dias = licenca ? Math.round((diaUTC(licenca) - diaUTC(hoje)) / 86_400_000) : 0
  const [la, lm] = (licenca || hoje).split('-').map(Number)
  const [ha, hm] = hoje.split('-').map(Number)
  const meses = Math.max(1, (la - ha) * 12 + (lm - hm))
  return {
    total,
    meta: n(meta),
    progresso: meta > 0 ? Math.min(1, total / meta) : 1,
    falta,
    dias,
    meses,
    por_mes: falta / meses,
    meses_cobertos: fixos > 0 ? total / fixos : 0,
  }
}

export type SituacaoMes = 'passado' | 'atual' | 'futuro'

export interface MesPlano {
  mes: string // YYYY-MM
  situacao: SituacaoMes
  /** quanto era (ou é) preciso guardar neste mês */
  parcela: number
  /** quanto foi lançado na reserva neste mês */
  guardado: number
}

export interface PlanoReserva {
  meses: MesPlano[]
  /** parcela do mês corrente */
  parcela_atual: number
  /** quanto ainda falta guardar no mês corrente */
  falta_mes: number
  /** quanto foi guardado além da parcela do mês corrente */
  extra_mes: number
  /** parcela de cada mês seguinte, já ajustada pelo que sobrou ou faltou */
  parcela_futura: number
  /** meses de guardar a partir do atual (inclusive) até a licença */
  meses_restantes: number
}

const mesesEntre = (de: string, ate: string) => {
  const [a1, m1] = de.split('-').map(Number)
  const [a2, m2] = ate.split('-').map(Number)
  return (a2 - a1) * 12 + (m2 - m1)
}

/**
 * Plano de quanto guardar por mês até o mês da licença (exclusive).
 * A parcela de cada mês é o que falta no começo dele dividido pelos meses
 * que restam. Por isso guardar a mais reduz as próximas parcelas, e guardar
 * a menos aumenta, sem precisar de nada manual.
 */
export function planoReserva(
  lancamentos: Pick<Reserva, 'data' | 'valor'>[],
  meta: number,
  licenca: string,
  hoje: string,
): PlanoReserva {
  const mesHoje = hoje.slice(0, 7)
  const mesLic = (licenca || hoje).slice(0, 7)
  const porMes = new Map<string, number>()
  for (const l of lancamentos) {
    const k = l.data.slice(0, 7)
    porMes.set(k, (porMes.get(k) ?? 0) + n(l.valor))
  }
  const guardadoAntes = (mes: string) => {
    let s = 0
    for (const [k, v] of porMes) if (k < mes) s += v
    return s
  }
  const parcelaDe = (mes: string) => {
    const restantes = mesesEntre(mes, mesLic)
    return restantes > 0 ? Math.max(0, n(meta) - guardadoAntes(mes)) / restantes : 0
  }

  const meses: MesPlano[] = []

  // Meses passados com lançamentos (desde o primeiro), para comparar com o plano da época.
  const primeiro = [...porMes.keys()].sort()[0]
  if (primeiro && primeiro < mesHoje)
    for (let m = primeiro; m < mesHoje && m < mesLic; m = somarMes(m, 1))
      meses.push({ mes: m, situacao: 'passado', parcela: parcelaDe(m), guardado: porMes.get(m) ?? 0 })

  const meses_restantes = Math.max(0, mesesEntre(mesHoje, mesLic))
  if (meses_restantes === 0)
    return { meses, parcela_atual: 0, falta_mes: 0, extra_mes: 0, parcela_futura: 0, meses_restantes }

  const parcela_atual = parcelaDe(mesHoje)
  const guardadoMes = porMes.get(mesHoje) ?? 0
  const falta_mes = Math.max(0, parcela_atual - guardadoMes)
  const extra_mes = Math.max(0, guardadoMes - parcela_atual)
  meses.push({ mes: mesHoje, situacao: 'atual', parcela: parcela_atual, guardado: guardadoMes })

  // Próximos meses: contam com a parcela deste mês completa; o que foi a mais abate delas.
  const totalLancado = [...porMes.values()].reduce((a, b) => a + b, 0)
  const parcela_futura =
    meses_restantes > 1 ? Math.max(0, n(meta) - totalLancado - falta_mes) / (meses_restantes - 1) : 0
  for (let m = somarMes(mesHoje, 1); m < mesLic; m = somarMes(m, 1))
    meses.push({ mes: m, situacao: 'futuro', parcela: parcela_futura, guardado: porMes.get(m) ?? 0 })

  return { meses, parcela_atual, falta_mes, extra_mes, parcela_futura, meses_restantes }
}

function somarMes(ym: string, delta: number) {
  const [a, m] = ym.split('-').map(Number)
  const d = new Date(a, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
