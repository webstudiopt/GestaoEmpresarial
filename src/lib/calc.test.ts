import { describe, expect, it } from 'vitest'
import {
  calcularServico,
  fixosTotal,
  horasCusto,
  maisVendidos,
  mesesAte,
  planoReserva,
  progressoMeta,
  resultadoMes,
  resumoReserva,
  separarCustos,
  serieFaturamento,
} from './calc'
import { textoWhatsApp } from './catalogo'
import { lerNumero } from './format'
import type { Atendimento, Servico } from './types'

// Custos como ficaram depois da migração (CONTEXTO, seção 5): pró-labore marcado
// e a locação das salas abatendo R$ 1.700.
const CUSTOS = [
  { valor: 6442.69, pro_labore: true }, // Meu salário (pró-labore)
  ...[1400, 33, 98.7, 60, 65.43, 200, 54, 376, 176.98, 25, 71.58, 300, 200, 320.35, 557.14, 66.9, 31.9, 50, 300].map(
    (valor) => ({ valor, pro_labore: false }),
  ),
  { valor: -1700, pro_labore: false }, // Locação das salas (abate o aluguel)
]

const PARAMS = { imposto: 0.054, taxa_cartao: 0 }
const SEPARADOS = separarCustos(CUSTOS)
const HORAS = horasCusto(SEPARADOS, 100)
const FIXOS = fixosTotal(CUSTOS)

describe('custos', () => {
  it('custos do studio R$ 2.686,98 e pró-labore R$ 6.442,69', () => {
    expect(SEPARADOS.studio).toBeCloseTo(2686.98, 2)
    expect(SEPARADOS.pro_labore).toBeCloseTo(6442.69, 2)
    expect(FIXOS).toBeCloseTo(2686.98 + 6442.69, 2)
  })
  it('hora do studio ≈ 26,87 e hora do pró-labore ≈ 64,43', () => {
    expect(HORAS.hora_studio).toBeCloseTo(26.87, 2)
    expect(HORAS.hora_pro_labore).toBeCloseTo(64.43, 2)
  })
  it('horas_mes zero não divide por zero', () => {
    expect(horasCusto(SEPARADOS, 0)).toEqual({ hora_studio: 0, hora_pro_labore: 0 })
  })
})

describe('serviço', () => {
  // Lucro por hora da tabela final (CONTEXTO, seção 6)
  it.each([
    ['Penteado', 180, 50, 5, 171],
    ['Soft', 230, 90, 10, 112],
    ['Luxo', 270, 105, 18, 109],
    ['Classic', 200, 90, 14, 90],
    ['Lash Lifting', 170, 80, 8, 88],
    ['Manutenção', 130, 60, 11.5, 85],
    ['Express', 170, 90, 10, 74],
    ['Classic amigas', 150, 90, 14, 58],
    ['Remoção', 30, 20, 3, 49],
  ])('%s: lucro por hora ≈ R$ %i', (_nome, preco, minutos, material, porHora) => {
    const r = calcularServico({ preco, minutos, material }, PARAMS, HORAS)
    expect(Math.round(r.lucro_por_hora)).toBe(porHora)
  })

  it('Soft: contas detalhadas e Saudável', () => {
    const r = calcularServico({ preco: 230, minutos: 90, material: 10 }, PARAMS, HORAS)
    expect(r.custo_real).toBeCloseTo(50.3, 1)
    expect(r.lucro).toBeCloseTo(230 * 0.946 - r.custo_real, 6)
    expect(r.sobra_apos_salario).toBeCloseTo(r.lucro - 1.5 * HORAS.hora_pro_labore, 6)
    expect(r.preco_minimo).toBeCloseTo((r.custo_real + 1.5 * HORAS.hora_pro_labore) / 0.946, 6)
    expect(r.margem).toBeCloseTo(r.lucro / 230, 6)
    expect(r.selo).toBe('saudavel')
  })

  it('preço no mínimo fica Saudável (sobra zero)', () => {
    const base = calcularServico({ preco: 0, minutos: 90, material: 10 }, PARAMS, HORAS)
    const r = calcularServico({ preco: base.preco_minimo, minutos: 90, material: 10 }, PARAMS, HORAS)
    expect(r.sobra_apos_salario).toBeCloseTo(0, 6)
    expect(r.selo).toBe('saudavel')
  })

  it('Remoção e Classic amigas dão lucro mas não pagam a hora dela', () => {
    expect(calcularServico({ preco: 30, minutos: 20, material: 3 }, PARAMS, HORAS).selo).toBe('abaixo')
    expect(calcularServico({ preco: 150, minutos: 90, material: 14 }, PARAMS, HORAS).selo).toBe('abaixo')
  })

  it('Permuta (R$ 0) é prejuízo', () => {
    expect(calcularServico({ preco: 0, minutos: 90, material: 12 }, PARAMS, HORAS).selo).toBe('prejuizo')
  })
})

describe('mês', () => {
  it('bate com o resultado médio do documento: R$ 12.730 → lucro ≈ 8.676 → sobra ≈ 2.233', () => {
    // 60 atendimentos, R$ 680 de material no mês
    const at = Array.from({ length: 60 }, (_, i) => ({
      valor: i < 10 ? 212.5 : 212.1,
      pagamento: 'Pix',
      material: 680 / 60,
      minutos: 100,
    })) as Pick<Atendimento, 'valor' | 'pagamento' | 'material' | 'minutos'>[]
    const r = resultadoMes(at, PARAMS, SEPARADOS)
    expect(r.faturamento).toBeCloseTo(12730, 2)
    expect(Math.round(r.lucro)).toBe(8676)
    expect(Math.round(r.sobra)).toBe(2233)
  })

  const at = [
    { valor: 230, pagamento: 'Pix', material: 10, minutos: 90 },
    { valor: 170, pagamento: 'Crédito', material: 10, minutos: 90 },
    { valor: 180, pagamento: 'Débito', material: 5, minutos: 50 },
    { valor: 30, pagamento: 'Dinheiro', material: 3, minutos: 20 },
  ] as Pick<Atendimento, 'valor' | 'pagamento' | 'material' | 'minutos'>[]

  it('calcula o resultado do mês', () => {
    const r = resultadoMes(at, PARAMS, SEPARADOS)
    expect(r.faturamento).toBe(610)
    expect(r.quantidade).toBe(4)
    expect(r.imposto).toBeCloseTo(610 * 0.054, 6)
    expect(r.taxas).toBe(0) // taxa repassada
    expect(r.material).toBeCloseTo(28, 6)
    expect(r.lucro).toBeCloseTo(610 - 610 * 0.054 - 28 - 2686.98, 2)
    expect(r.sobra).toBeCloseTo(r.lucro - 6442.69, 2)
    expect(r.ticket).toBe(152.5)
    expect(r.por_hora).toBeCloseTo(610 / 4.1666667, 4)
  })

  it('taxa de cartão só entra se não for repassada', () => {
    const r = resultadoMes(at, { imposto: 0.054, taxa_cartao: 0.035 }, SEPARADOS)
    expect(r.taxas).toBeCloseTo((170 + 180) * 0.035, 6)
  })

  it('mês vazio não quebra', () => {
    const r = resultadoMes([], PARAMS, SEPARADOS)
    expect(r.faturamento).toBe(0)
    expect(r.ticket).toBeNull()
    expect(r.por_hora).toBeNull()
    expect(r.sobra).toBeCloseTo(-(2686.98 + 6442.69), 2)
  })

  it('meta: falta e atendimentos no ticket', () => {
    const m = progressoMeta(10000, 15000, 215)
    expect(m.falta).toBe(5000)
    expect(m.atendimentos).toBe(24)
    expect(m.progresso).toBeCloseTo(2 / 3, 6)
    expect(progressoMeta(16000, 15000, 215)).toMatchObject({ falta: 0, progresso: 1, atendimentos: 0 })
  })

  it('agrupa o que mais saiu', () => {
    const r = maisVendidos([
      { servico_nome: 'Express', valor: 187 },
      { servico_nome: 'Soft Hyper', valor: 247 },
      { servico_nome: 'Express', valor: 187 },
    ])
    expect(r[0]).toEqual({ nome: 'Express', quantidade: 2, total: 374 })
    expect(r[1].nome).toBe('Soft Hyper')
  })
})

describe('gráfico', () => {
  it('lista 8 meses atravessando o ano', () => {
    expect(mesesAte('2026-02', 8)).toEqual([
      '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02',
    ])
  })

  it('usa atendimentos quando há, histórico quando não há', () => {
    const s = serieFaturamento(
      '2026-10',
      3,
      [{ data: '2026-10-03', valor: 300 }, { data: '2026-09-20', valor: 100 }],
      [{ mes: '2026-09', total: 14045 }, { mes: '2026-08', total: 13112 }],
    )
    expect(s).toEqual([
      { mes: '2026-08', total: 13112, fonte: 'historico' },
      { mes: '2026-09', total: 100, fonte: 'atendimentos' },
      { mes: '2026-10', total: 300, fonte: 'atendimentos' },
    ])
  })
})

describe('reserva', () => {
  it('calcula dias, quanto guardar por mês e meses cobertos', () => {
    const r = resumoReserva([{ valor: 3000 }, { valor: 2000 }], 20000, '2027-02-01', '2026-10-01', FIXOS)
    expect(r.total).toBe(5000)
    expect(r.falta).toBe(15000)
    expect(r.dias).toBe(123)
    expect(r.meses).toBe(4)
    expect(r.por_mes).toBe(3750)
    expect(r.meses_cobertos).toBeCloseTo(5000 / FIXOS, 6)
  })
})

describe('catálogo e números', () => {
  it('monta o texto do WhatsApp', () => {
    const servicos = [
      { id: '1', nome: 'Soft Hyper', categoria: 'Aplicação', preco: 247, minutos: 100, material: 10, descricao: 'Fios em Y', no_catalogo: true, ordem: 1 },
      { id: '2', nome: 'Antigo', categoria: 'Outros', preco: 150, minutos: 85, material: 10, descricao: '', no_catalogo: false, ordem: 2 },
      // marcado "no catálogo" por engano, mas é preço especial: não pode aparecer
      { id: '3', nome: 'Soft amigas', categoria: 'Aplicação', preco: 170, minutos: 90, material: 10, descricao: '', no_catalogo: true, ordem: 3, tipo_preco: 'especial', ativo: true },
      { id: '4', nome: 'Desativado', categoria: 'Outros', preco: 99, minutos: 30, material: 1, descricao: '', no_catalogo: true, ordem: 4, tipo_preco: 'padrao', ativo: false },
    ] as Servico[]
    const t = textoWhatsApp(servicos, '- Sinal de 50%')
    expect(t).toContain('*APLICAÇÕES*')
    expect(t).toContain('• *Soft Hyper* — R$ 247')
    expect(t).toContain('_Fios em Y · 1h40_')
    expect(t).toContain('• Sinal de 50%')
    expect(t).not.toContain('Antigo')
    expect(t).not.toContain('Soft amigas')
    expect(t).not.toContain('Desativado')
  })

  it('lê números no formato brasileiro', () => {
    expect(lerNumero('98,70')).toBe(98.7)
    expect(lerNumero('1.400')).toBe(1400)
    expect(lerNumero('1.400,50')).toBe(1400.5)
    expect(lerNumero('98.7')).toBe(98.7)
    expect(lerNumero('-1.700')).toBe(-1700)
    expect(lerNumero('−1.700,50')).toBe(-1700.5)
    expect(lerNumero('-')).toBeNull()
    expect(lerNumero('')).toBeNull()
    expect(lerNumero('abc')).toBeNull()
  })
})

describe('plano da reserva', () => {
  const META = 20000
  const LIC = '2027-02-01'

  it('sem nada guardado, divide igual pelos meses até a licença', () => {
    const p = planoReserva([], META, LIC, '2026-10-15')
    expect(p.meses_restantes).toBe(4) // out, nov, dez, jan
    expect(p.parcela_atual).toBe(5000)
    expect(p.parcela_futura).toBe(5000)
    expect(p.meses.map((m) => `${m.mes}:${m.situacao}`)).toEqual([
      '2026-10:atual', '2026-11:futuro', '2026-12:futuro', '2027-01:futuro',
    ])
  })

  it('mostra meses passados com a parcela que valia na época', () => {
    const p = planoReserva([{ data: '2026-09-10', valor: 3000 }], META, LIC, '2026-10-15')
    expect(p.meses[0]).toEqual({ mes: '2026-09', situacao: 'passado', parcela: 4000, guardado: 3000 })
    expect(p.parcela_atual).toBe(4250) // (20000 - 3000) / 4
  })

  it('guardar a mais no mês diminui as próximas parcelas', () => {
    const p = planoReserva(
      [{ data: '2026-09-10', valor: 3000 }, { data: '2026-10-05', valor: 6000 }],
      META, LIC, '2026-10-15',
    )
    expect(p.falta_mes).toBe(0)
    expect(p.extra_mes).toBe(1750)
    expect(p.parcela_futura).toBeCloseTo(11000 / 3, 6) // < 4250
  })

  it('guardar a menos aumenta as parcelas quando o mês vira', () => {
    const lanc = [{ data: '2026-09-10', valor: 3000 }, { data: '2026-10-05', valor: 1000 }]
    const emOutubro = planoReserva(lanc, META, LIC, '2026-10-15')
    expect(emOutubro.falta_mes).toBe(3250)
    expect(emOutubro.parcela_futura).toBe(4250) // ainda conta que outubro vai fechar
    const emNovembro = planoReserva(lanc, META, LIC, '2026-11-02')
    expect(emNovembro.parcela_atual).toBeCloseTo(16000 / 3, 6) // subiu
  })

  it('meta já batida zera as parcelas', () => {
    const p = planoReserva([{ data: '2026-10-01', valor: 25000 }], META, LIC, '2026-10-15')
    expect(p.parcela_futura).toBe(0)
    expect(p.extra_mes).toBe(20000)
  })

  it('no mês da licença não há mais parcelas', () => {
    const p = planoReserva([], META, LIC, '2027-02-10')
    expect(p.meses_restantes).toBe(0)
    expect(p.parcela_atual).toBe(0)
  })
})
