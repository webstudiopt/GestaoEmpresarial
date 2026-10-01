const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtBRL0 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})

const ok = (v: number) => (Number.isFinite(v) ? v : 0)

/** R$ 1.234,56 */
export const brl = (v: number) => fmtBRL.format(ok(v))
/** R$ 1.235 (arredondado) */
export const brl0 = (v: number) => fmtBRL0.format(Math.round(ok(v)))
/** Sem centavos quando o valor é inteiro (catálogo). */
export const brlPreco = (v: number) => (Number.isInteger(ok(v)) ? brl0(v) : brl(v))

export const pct = (v: number, casas = 1) =>
  (ok(v) * 100).toLocaleString('pt-BR', { maximumFractionDigits: casas }) + '%'

export const decimal = (v: number, casas = 1) =>
  ok(v).toLocaleString('pt-BR', { maximumFractionDigits: casas })

/** Troca espaços especiais do Intl por espaço comum (texto para colar). */
export const espacoSimples = (s: string) => s.replace(/[  ]/g, ' ')

const dois = (n: number) => String(n).padStart(2, '0')

/** Data local de hoje em YYYY-MM-DD (toISOString usaria UTC e viraria o dia à noite). */
export function hojeISO(agora = new Date()) {
  return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`
}

export const mesAtual = () => hojeISO().slice(0, 7)

export function somarMeses(ym: string, delta: number) {
  const [a, m] = ym.split('-').map(Number)
  const d = new Date(a, m - 1 + delta, 1)
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}`
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export function nomeMes(ym: string) {
  const [a, m] = ym.split('-').map(Number)
  return `${MESES[m - 1]} de ${a}`
}

export function mesCurto(ym: string) {
  return MESES[Number(ym.slice(5, 7)) - 1].slice(0, 3)
}

/** 01/10/26 */
export function dataCurta(iso: string) {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a.slice(2)}`
}

/** 01/10/2026 */
export function dataLonga(iso: string) {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

/** quarta-feira, 01/10 */
export function diaSemana(iso: string) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
}

/** 100 → "1h40"; 45 → "45 min" */
export function duracao(minutos: number) {
  const m = Math.round(ok(minutos))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (!h) return `${r} min`
  return r ? `${h}h${dois(r)}` : `${h}h`
}

/**
 * Lê número digitado no padrão brasileiro ou com ponto decimal:
 * "1.400" → 1400, "98,70" → 98.7, "98.7" → 98.7, "" → null.
 */
export function lerNumero(txt: string): number | null {
  let s = txt.trim().replace(/\s|R\$/g, '')
  if (!s) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** 98.7 → "98,7" para mostrar num campo editável */
export function numeroParaCampo(v: number | null | undefined, casas = 2) {
  if (v == null || !Number.isFinite(v)) return ''
  return String(Math.round(v * 10 ** casas) / 10 ** casas).replace('.', ',')
}
