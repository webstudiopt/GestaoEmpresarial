// Contas do negócio. Funções puras: recebem dados, devolvem números.
// Modelo de custo: o lucro é SEPARADO do pró-labore (ver CONTEXTO, seção 5).
// As fórmulas são as mesmas da visão procedimentos_margem do banco; ver calc.test.ts.

import type { Atendimento, Config, Custo, Historico, Reserva, Servico } from './types'

const n = (v: unknown) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

/** Saudável: paga o studio e a hora dela. Abaixo: dá lucro, mas não paga a hora dela. Prejuízo: não dá lucro. */
export type Selo = 'saudavel' | 'abaixo' | 'prejuizo'

export const SELO_TEXTO: Record<Selo, string> = {
  saudavel: 'Saudável',
  abaixo: 'Abaixo da sua hora',
  prejuizo: 'Prejuízo',
}

/** Soma de todos os custos do mês, pró-labore incluído. */
export function fixosTotal(custos: Pick<Custo, 'valor'>[]) {
  return custos.reduce((a, c) => a + n(c.valor), 0)
}

export interface CustosSeparados {
  /** custos do studio, já com a locação das salas abatendo (valor negativo) */
  studio: number
  pro_labore: number
}

export function separarCustos(custos: Pick<Custo, 'valor' | 'pro_labore'>[]): CustosSeparados {
  let studio = 0
  let pro_labore = 0
  for (const c of custos) {
    if (c.pro_labore) pro_labore += n(c.valor)
    else studio += n(c.valor)
  }
  return { studio, pro_labore }
}

export interface HorasCusto {
  /** custos do studio ÷ horas de atendimento no mês */
  hora_studio: number
  /** pró-labore ÷ horas de atendimento no mês */
  hora_pro_labore: number
}

export function horasCusto(c: CustosSeparados, horas_mes: number): HorasCusto {
  if (!(horas_mes > 0)) return { hora_studio: 0, hora_pro_labore: 0 }
  return { hora_studio: c.studio / horas_mes, hora_pro_labore: c.pro_labore / horas_mes }
}

export interface CalculoServico {
  horas: number
  /** h × hora_studio + material */
  custo_real: number
  /** preço − imposto − custo_real (é daqui que sai o pró-labore) */
  lucro: number
  margem: number
  lucro_por_hora: number
  /** lucro − a parte do pró-labore daquele tempo */
  sobra_apos_salario: number
  /** preço que paga o studio e a hora dela */
  preco_minimo: number
  selo: Selo
}

/** A taxa da maquininha é repassada para a cliente, então não entra aqui. */
export function calcularServico(
  s: Pick<Servico, 'preco' | 'minutos' | 'material'>,
  p: Pick<Config, 'imposto'>,
  h: HorasCusto,
): CalculoServico {
  const preco = n(s.preco)
  const imposto = n(p.imposto)
  const horas = n(s.minutos) / 60
  const custo_real = horas * h.hora_studio + n(s.material)
  const lucro = preco * (1 - imposto) - custo_real
  const sobra_apos_salario = lucro - horas * h.hora_pro_labore
  const preco_minimo = imposto < 1 ? (custo_real + horas * h.hora_pro_labore) / (1 - imposto) : Infinity
  // meio centavo de folga para arredondamento não virar o selo
  const selo: Selo = lucro <= 0.005 ? 'prejuizo' : sobra_apos_salario < -0.005 ? 'abaixo' : 'saudavel'
  return {
    horas,
    custo_real,
    lucro,
    margem: preco > 0 ? lucro / preco : 0,
    lucro_por_hora: horas > 0 ? lucro / horas : 0,
    sobra_apos_salario,
    preco_minimo,
    selo,
  }
}

export interface ResultadoMes {
  faturamento: number
  quantidade: number
  imposto: number
  /** só se a taxa da maquininha não for repassada (config.taxa_cartao > 0) */
  taxas: number
  material: number
  custos_studio: number
  /** faturamento − imposto − taxas − material − custos do studio */
  lucro: number
  pro_labore: number
  /** lucro − pró-labore: o que fica na empresa */
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
  custos: CustosSeparados,
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
  const lucro = faturamento - imposto - taxas - material - custos.studio
  return {
    faturamento,
    quantidade,
    imposto,
    taxas,
    material,
    custos_studio: custos.studio,
    lucro,
    pro_labore: custos.pro_labore,
    sobra: lucro - custos.pro_labore,
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
