import { describe, expect, it } from 'vitest'
import { encontrarServico, eventoDaApi, interpretarTitulo, jaRegistrado } from './agendaGoogle'
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
