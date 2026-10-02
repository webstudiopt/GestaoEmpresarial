import { describe, expect, it } from 'vitest'
import {
  atendimentoDoEvento,
  encontrarServico,
  eventoDaApi,
  interpretarEvento,
  interpretarTitulo,
  jaRegistrado,
  separarTelefone,
  separarParaImportar,
  type EventoInterpretado,
} from './agendaGoogle'
import type { Servico } from './types'

const nomes = [
  'Express', 'Classic Hyper', 'Soft Hyper', 'Luxo Hyper', 'Full Hyper',
  'Manutenção Express', 'Manutenção Classic', 'Manutenção Soft', 'Manutenção Luxo / Full',
  'Lash Lifting', 'Penteado', 'Remoção',
]
const SERVICOS = nomes.map((nome, i) => ({ id: String(i), nome, preco: 100 + i }) as Servico)
const nome = (s: Servico | null) => s?.nome ?? null

describe('serviço no título', () => {
  it('acha pelo nome inteiro, sem ligar para acento e maiúsculas', () => {
    expect(nome(encontrarServico('soft hyper', SERVICOS))).toBe('Soft Hyper')
    expect(nome(encontrarServico('MANUTENCAO SOFT', SERVICOS))).toBe('Manutenção Soft')
    expect(nome(encontrarServico('remocao', SERVICOS))).toBe('Remoção')
  })
  it('prefere o nome mais longo contido', () => {
    expect(nome(encontrarServico('Manutenção Express', SERVICOS))).toBe('Manutenção Express')
  })
  it('acha por pedaço do nome', () => {
    expect(nome(encontrarServico('soft', SERVICOS))).toBe('Soft Hyper')
    expect(nome(encontrarServico('lifting', SERVICOS))).toBe('Lash Lifting')
  })
  it('não inventa serviço', () => {
    expect(encontrarServico('Ana Paula', SERVICOS)).toBeNull()
  })
})

describe('título do evento', () => {
  it.each([
    ['Ana - Soft Hyper', 'Ana', 'Soft Hyper'],
    ['Ana Paula – Manutenção Soft', 'Ana Paula', 'Manutenção Soft'],
    ['Soft Hyper + Beatriz', 'Beatriz', 'Soft Hyper'],
    ['Carla | penteado', 'Carla', 'Penteado'],
    ['Daniela: lash lifting', 'Daniela', 'Lash Lifting'],
    ['Eduarda Soft Hyper', 'Eduarda', 'Soft Hyper'],
    ['Ana-Clara - Express', 'Ana-Clara', 'Express'],
  ])('%s', (titulo, cliente, servico) => {
    const r = interpretarTitulo(titulo, SERVICOS)
    expect(r.cliente).toBe(cliente)
    expect(nome(r.servico)).toBe(servico)
  })

  it('sem serviço reconhecido, o título inteiro vira o nome', () => {
    expect(interpretarTitulo('Fernanda', SERVICOS)).toEqual({ cliente: 'Fernanda', servico: null })
    expect(interpretarTitulo('Fernanda - consulta', SERVICOS)).toEqual({ cliente: 'Fernanda consulta', servico: null })
  })
})

describe('já registrado', () => {
  const at = [{ data: '2026-10-05', cliente: 'Ana Paula' }]
  it('casa nome igual ou só o primeiro nome, no mesmo dia', () => {
    expect(jaRegistrado({ data: '2026-10-05', cliente: 'ana paula' }, at)).toBe(true)
    expect(jaRegistrado({ data: '2026-10-05', cliente: 'Ana' }, at)).toBe(true)
    expect(jaRegistrado({ data: '2026-10-06', cliente: 'Ana' }, at)).toBe(false)
    expect(jaRegistrado({ data: '2026-10-05', cliente: 'Anabela' }, at)).toBe(false)
  })
})

describe('evento da API', () => {
  it('pega data e hora no fuso do aparelho', () => {
    const ev = eventoDaApi({ id: '1', summary: ' Ana - Soft ', start: { dateTime: '2026-10-05T14:30:00' } })
    expect(ev).toEqual({ id: '1', titulo: 'Ana - Soft', data: '2026-10-05', hora: '14:30' })
  })
  it('ignora dia inteiro e cancelado', () => {
    expect(eventoDaApi({ id: '1', summary: 'Feriado', start: { date: '2026-10-12' } })).toBeNull()
    expect(eventoDaApi({ id: '2', status: 'cancelled', start: { dateTime: '2026-10-05T10:00:00' } })).toBeNull()
  })
})

describe('importar todos', () => {
  const soft = { ...SERVICOS[2], categoria: 'Aplicação', minutos: 100, material: 10, preco: 247 } as Servico
  const ev = (id: string, data: string, cliente: string, servico: Servico | null): EventoInterpretado => ({
    id, titulo: '', data, hora: '14:00', cliente, telefone: '', cliente_id: null, servico,
    origem_servico: servico ? 'titulo' : null, registrado: false,
  })

  it('só entram os de hoje para trás com serviço reconhecido', () => {
    const r = separarParaImportar(
      [
        ev('1', '2026-10-01', 'Ana', soft),
        ev('2', '2026-10-05', 'Bia', soft), // hoje
        ev('3', '2026-10-06', 'Cris', soft), // futuro
        ev('4', '2026-10-02', 'Duda', null), // sem serviço
      ],
      '2026-10-05',
    )
    expect(r.prontos.map((e) => e.id)).toEqual(['1', '2'])
    expect(r.futuros.map((e) => e.id)).toEqual(['3'])
    expect(r.semServico.map((e) => e.id)).toEqual(['4'])
  })

  it('gera o atendimento com a cópia do serviço', () => {
    const a = atendimentoDoEvento({ ...ev('1', '2026-10-01', 'Ana', soft), servico: soft })
    expect(a).toMatchObject({
      data: '2026-10-01', cliente: 'Ana', servico_nome: 'Soft Hyper', valor: 247, minutos: 100, material: 10, pagamento: 'Pix',
    })
    expect(a.obs).toBe('Importado da Google Agenda (14:00)')
  })
})

describe('agenda da Ana: "Nome telefone"', () => {
  // tabela nova (depois da migração)
  const novos = [
    ['s1', 'Express / Fio a fio / Brasileiro / Egípcio', 'padrao'],
    ['s2', 'Classic', 'padrao'],
    ['s3', 'Soft', 'padrao'],
    ['s4', 'Manutenção', 'padrao'],
    ['s5', 'Soft — amigas próximas', 'especial'],
  ].map(([id, nome, tipo_preco]) => ({ id, nome, tipo_preco, ativo: true, preco: 100 }) as Servico)
  const clientes = [
    { id: 'c1', nome: 'Gabi Teixeira', telefone: '31999881234' },
    { id: 'c2', nome: 'Maria', telefone: '' },
  ]
  const atendimentos = [
    // importado do relatório: nome antigo do serviço, sem servico_id
    { data: '2026-09-01', cliente: 'Gabi T.', cliente_id: 'c1', servico_id: null, servico_nome: 'Soft Hyper' },
    { data: '2026-08-01', cliente: 'Gabi T.', cliente_id: 'c1', servico_id: null, servico_nome: 'Classic Hyper' },
    { data: '2026-09-01', cliente: 'Maria', cliente_id: 'c2', servico_id: null, servico_nome: 'Manutenção Soft' },
  ]
  const ctx = { servicos: novos, clientes, atendimentos }
  const evento = (titulo: string, data = '2026-10-05') => ({ id: 'e', titulo, data, hora: '09:00' })

  it.each([
    ['Maria 31 99999-1234', '31999991234', 'Maria'],
    ['Gabi (31) 9 9988-1234', '31999881234', 'Gabi'],
    ['+55 31 99988-1234 Gabi', '5531999881234', 'Gabi'],
    ['Ana Paula 9988-1234', '99881234', 'Ana Paula'],
    ['Ana Paula', '', 'Ana Paula'],
  ])('separa o telefone de "%s"', (titulo, telefone, resto) => {
    expect(separarTelefone(titulo)).toEqual({ telefone, resto })
  })

  it('acha a ficha pelos 8 últimos dígitos, mesmo com outro nome no título', () => {
    const r = interpretarEvento(evento('Gabi 31 9 9988-1234'), ctx)
    expect(r.cliente_id).toBe('c1')
    expect(r.cliente).toBe('Gabi Teixeira')
    expect(r.telefone).toBe('31999881234')
  })

  it('sem serviço no título, sugere o último que ela fez, com o nome da tabela nova', () => {
    const r = interpretarEvento(evento('Gabi 31 99988-1234'), ctx)
    expect(r.servico?.nome).toBe('Soft') // último: "Soft Hyper" em setembro
    expect(r.origem_servico).toBe('historico')
    const m = interpretarEvento(evento('Maria 31 91111-2222'), ctx) // telefone desconhecido: acha pelo nome
    expect(m.cliente_id).toBe('c2')
    expect(m.servico?.nome).toBe('Manutenção') // "Manutenção Soft" → Manutenção
  })

  it('serviço escrito no título vale mais que o histórico', () => {
    const r = interpretarEvento(evento('Gabi 31 99988-1234 - classic'), ctx)
    expect(r.servico?.nome).toBe('Classic')
    expect(r.origem_servico).toBe('titulo')
  })

  it('cliente nova, sem histórico: sem serviço', () => {
    const r = interpretarEvento(evento('Joana 31 97777-0000'), ctx)
    expect(r).toMatchObject({ cliente: 'Joana', cliente_id: null, servico: null, origem_servico: null })
  })

  it('já registrado quando há atendimento da mesma ficha no dia', () => {
    const ctx2 = {
      ...ctx,
      atendimentos: [
        ...atendimentos,
        { data: '2026-10-05', cliente: 'Gabi T.', cliente_id: 'c1', servico_id: 's3', servico_nome: 'Soft' },
      ],
    }
    expect(interpretarEvento(evento('Gabi 31 99988-1234'), ctx2).registrado).toBe(true)
    expect(interpretarEvento(evento('Gabi 31 99988-1234', '2026-10-06'), ctx2).registrado).toBe(false)
  })

  it('importado pelo histórico avisa na observação', () => {
    const r = interpretarEvento(evento('Gabi 31 99988-1234'), ctx)
    const a = atendimentoDoEvento({ ...r, servico: r.servico! })
    expect(a.cliente_id).toBe('c1')
    expect(a.obs).toBe('Importado da Google Agenda (09:00) · serviço pelo histórico, confira')
  })
})
