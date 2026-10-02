// Interpreta eventos da Google Agenda. Funções puras (testadas em agendaGoogle.test.ts).
// Na agenda da Ana o título é "Nome telefone" (ex.: "Maria 31 99999-1234").
// A cliente é achada pelos 8 últimos dígitos do telefone; o serviço vem do título,
// se estiver lá ("Ana - Soft"), ou do último serviço que essa cliente fez.

import { hojeISO } from './format'
import type { Atendimento, Cliente, Servico } from './types'

export interface EventoAgenda {
  id: string
  titulo: string
  data: string // YYYY-MM-DD (fuso do aparelho)
  hora: string // HH:MM
}

export interface EventoInterpretado extends EventoAgenda {
  cliente: string
  /** só dígitos; vazio se o título não tiver telefone */
  telefone: string
  /** ficha da cliente, se achada pelo telefone ou pelo nome */
  cliente_id: string | null
  servico: Servico | null
  /** de onde veio o serviço: escrito no título ou o último que ela fez */
  origem_servico: 'titulo' | 'historico' | null
  registrado: boolean
}

/** minúsculas, sem acentos e sem espaços repetidos */
export function normalizar(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Acha o serviço citado num pedaço de texto. */
export function encontrarServico(texto: string, servicos: Servico[]): Servico | null {
  const t = normalizar(texto)
  if (!t) return null
  // 1) o texto contém o nome inteiro do serviço: fica com o nome mais longo
  //    ("manutencao soft hyper" acha "Manutenção Soft", não só "Soft Hyper")
  const contidos = servicos.filter((s) => t.includes(normalizar(s.nome)))
  if (contidos.length) return contidos.sort((a, b) => b.nome.length - a.nome.length)[0]
  // 2) o texto é um pedaço do nome ("soft" → "Soft Hyper"): prefere o que começa igual
  if (t.length >= 3) {
    const parciais = servicos.filter((s) => normalizar(s.nome).includes(t))
    if (parciais.length)
      return parciais.sort(
        (a, b) =>
          Number(normalizar(b.nome).startsWith(t)) - Number(normalizar(a.nome).startsWith(t)) ||
          a.nome.length - b.nome.length,
      )[0]
  }
  return null
}

// Separadores aceitos entre nome e serviço. O hífen só conta com espaços
// em volta, para não quebrar nomes como "Ana-Clara".
const SEPARADOR = /\s+[-–—]\s+|\s*[+|/:]\s*/

const limpar = (s: string) => s.replace(/^[\s,.;-]+|[\s,.;-]+$/g, '').replace(/\s+/g, ' ')

export function interpretarTitulo(titulo: string, servicos: Servico[]): { cliente: string; servico: Servico | null } {
  const partes = titulo.split(SEPARADOR).map(limpar).filter(Boolean)

  if (partes.length >= 2) {
    const i = partes.findIndex((p) => encontrarServico(p, servicos))
    if (i >= 0)
      return {
        servico: encontrarServico(partes[i], servicos),
        cliente: partes.filter((_, j) => j !== i).join(' '),
      }
  }

  // Sem separador: procura o serviço dentro do título e o resto vira o nome.
  const servico = encontrarServico(titulo, servicos)
  if (!servico || normalizar(titulo) === normalizar(servico.nome)) return { cliente: limpar(partes.join(' ')), servico }
  const palavrasServico = new Set(normalizar(servico.nome).split(' '))
  const cliente = titulo
    .split(/\s+/)
    .filter((p) => !palavrasServico.has(normalizar(p)))
    .join(' ')
  return { cliente: limpar(cliente), servico }
}

/**
 * Já existe atendimento no mesmo dia para essa cliente?
 * Casa pela ficha (cliente_id) ou pelo nome ("Ana" casa com "Ana Paula").
 */
export function jaRegistrado(
  ev: { data: string; cliente: string; cliente_id?: string | null },
  atendimentos: (Pick<Atendimento, 'data' | 'cliente'> & { cliente_id?: string | null })[],
) {
  const c = normalizar(ev.cliente)
  if (!c && !ev.cliente_id) return false
  return atendimentos.some((a) => {
    if (a.data !== ev.data) return false
    if (ev.cliente_id && a.cliente_id === ev.cliente_id) return true
    const outro = normalizar(a.cliente)
    return !!c && (outro === c || outro.startsWith(c + ' ') || c.startsWith(outro + ' '))
  })
}

/** Últimos 8 dígitos: a chave da cliente, com ou sem DDD e o 9 na frente. */
export const chaveTelefone = (telefone: string) => telefone.replace(/\D/g, '').slice(-8)

/** Tira o telefone do título: "Maria 31 99999-1234" → { telefone: "31999991234", resto: "Maria" }. */
export function separarTelefone(titulo: string): { telefone: string; resto: string } {
  for (const m of titulo.matchAll(/\+?\(?\d[\d\s().-]*\d/g)) {
    const digitos = m[0].replace(/\D/g, '')
    if (digitos.length >= 8 && digitos.length <= 13) {
      const resto = titulo.slice(0, m.index) + ' ' + titulo.slice((m.index ?? 0) + m[0].length)
      return { telefone: digitos, resto: limpar(resto) }
    }
  }
  return { telefone: '', resto: titulo }
}

export interface ContextoAgenda {
  servicos: Servico[]
  clientes: Pick<Cliente, 'id' | 'nome' | 'telefone'>[]
  atendimentos: (Pick<Atendimento, 'data' | 'cliente' | 'servico_id' | 'servico_nome'> & {
    cliente_id?: string | null
  })[]
}

/** Lê um evento: cliente pelo telefone, serviço pelo título ou pelo histórico, e se já foi registrado. */
export function interpretarEvento(ev: EventoAgenda, ctx: ContextoAgenda): EventoInterpretado {
  const ativos = ctx.servicos.filter((s) => s.ativo !== false)
  const { telefone, resto } = separarTelefone(ev.titulo)
  const doTitulo = interpretarTitulo(resto, ativos)

  const chave = chaveTelefone(telefone)
  const ficha =
    (chave.length === 8 && ctx.clientes.find((c) => c.telefone && chaveTelefone(c.telefone) === chave)) ||
    (doTitulo.cliente && ctx.clientes.find((c) => normalizar(c.nome) === normalizar(doTitulo.cliente))) ||
    null
  const cliente = ficha ? ficha.nome : doTitulo.cliente

  let servico = doTitulo.servico
  let origem_servico: EventoInterpretado['origem_servico'] = servico ? 'titulo' : null
  if (!servico && cliente) {
    // último atendimento dela; os antigos guardam o nome da época ("Soft Hyper" → "Soft")
    const ultimo = ctx.atendimentos
      .filter((a) => (ficha && a.cliente_id === ficha.id) || normalizar(a.cliente) === normalizar(cliente))
      .sort((a, b) => b.data.localeCompare(a.data))[0]
    if (ultimo) {
      servico =
        ativos.find((s) => s.id === ultimo.servico_id) ?? encontrarServico(ultimo.servico_nome, ativos) ?? null
      if (servico) origem_servico = 'historico'
    }
  }

  return {
    ...ev,
    cliente,
    telefone,
    cliente_id: ficha ? ficha.id : null,
    servico,
    origem_servico,
    registrado: jaRegistrado({ data: ev.data, cliente, cliente_id: ficha ? ficha.id : null }, ctx.atendimentos),
  }
}

interface ItemApi {
  id: string
  summary?: string
  status?: string
  start?: { dateTime?: string; date?: string }
}

/** Converte um evento da API. Eventos de dia inteiro e cancelados ficam de fora. */
export function eventoDaApi(item: ItemApi): EventoAgenda | null {
  const inicio = item.start?.dateTime
  if (!inicio || item.status === 'cancelled') return null
  const d = new Date(inicio)
  return {
    id: item.id,
    titulo: (item.summary ?? '').trim(),
    data: hojeISO(d),
    hora: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  }
}

export const OBS_IMPORTADO = 'Importado da Google Agenda'

/**
 * Separa os horários pendentes para importar de uma vez.
 * Entram só os de hoje para trás com serviço reconhecido: horário futuro
 * ainda pode ter falta ou remarcação e não deve contar no faturamento.
 */
export function separarParaImportar(pendentes: EventoInterpretado[], hoje: string) {
  const prontos: EventoInterpretado[] = []
  const semServico: EventoInterpretado[] = []
  const futuros: EventoInterpretado[] = []
  for (const ev of pendentes) {
    if (ev.data > hoje) futuros.push(ev)
    else if (!ev.servico || !ev.cliente) semServico.push(ev)
    else prontos.push(ev)
  }
  return { prontos, semServico, futuros }
}

/** Atendimento gerado de um evento (cópia do serviço, como no registro manual). */
export function atendimentoDoEvento(ev: EventoInterpretado & { servico: Servico }) {
  return {
    data: ev.data,
    cliente: ev.cliente,
    cliente_id: ev.cliente_id,
    servico_id: ev.servico.id,
    servico_nome: ev.servico.nome,
    categoria: ev.servico.categoria,
    valor: ev.servico.preco,
    minutos: ev.servico.minutos,
    material: ev.servico.material,
    pagamento: 'Pix' as const,
    obs: `${OBS_IMPORTADO} (${ev.hora})${ev.origem_servico === 'historico' ? ' · serviço pelo histórico, confira' : ''}`,
  }
}
