// Interpreta eventos da Google Agenda. Funções puras (testadas em agendaGoogle.test.ts).
// O título do evento deve ter o nome da cliente e o serviço, em qualquer ordem:
// "Ana - Soft Hyper", "Soft Hyper + Ana", "Ana | manutenção soft", "Ana Soft Hyper".

import { hojeISO } from './format'
import type { Atendimento, Servico } from './types'

export interface EventoAgenda {
  id: string
  titulo: string
  data: string // YYYY-MM-DD (fuso do aparelho)
  hora: string // HH:MM
}

export interface EventoInterpretado extends EventoAgenda {
  cliente: string
  servico: Servico | null
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

/** Já existe atendimento no mesmo dia para essa cliente? ("Ana" casa com "Ana Paula") */
export function jaRegistrado(
  ev: { data: string; cliente: string },
  atendimentos: Pick<Atendimento, 'data' | 'cliente'>[],
) {
  const c = normalizar(ev.cliente)
  if (!c) return false
  return atendimentos.some((a) => {
    if (a.data !== ev.data) return false
    const outro = normalizar(a.cliente)
    return outro === c || outro.startsWith(c + ' ') || c.startsWith(outro + ' ')
  })
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
