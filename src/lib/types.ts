// Espelha as colunas de supabase/schema.sql (mesmos nomes, snake_case).

export const CATEGORIAS = ['Aplicação', 'Manutenção', 'Lash lifting', 'Penteado', 'Outros'] as const
export type Categoria = (typeof CATEGORIAS)[number]

export const PAGAMENTOS = ['Pix', 'Dinheiro', 'Débito', 'Crédito', 'Permuta'] as const
export type Pagamento = (typeof PAGAMENTOS)[number]

export interface Servico {
  id: string
  nome: string
  categoria: Categoria
  preco: number
  minutos: number
  material: number
  descricao: string
  no_catalogo: boolean
  ordem: number
}

export interface Custo {
  id: string
  nome: string
  valor: number
  ordem: number
}

export interface Atendimento {
  id: string
  data: string // YYYY-MM-DD
  cliente: string
  servico_id: string | null
  servico_nome: string
  categoria: string
  valor: number
  minutos: number
  material: number
  pagamento: Pagamento
  obs: string
  criado_em: string
}

/** Uma reserva (ex.: Licença, Reforma), com meta e data em que o dinheiro precisa estar pronto. */
export interface ReservaObjetivo {
  id: string
  nome: string
  meta: number
  data_alvo: string // YYYY-MM-DD
  ordem: number
}

/** Valor guardado numa reserva (tabela public.reserva). */
export interface Reserva {
  id: string
  reserva_id: string
  data: string
  descricao: string
  valor: number
}

export interface Historico {
  id: string
  mes: string // YYYY-MM
  total: number
}

export interface Config {
  user_id: string
  imposto: number
  taxa_cartao: number
  horas_mes: number
  lucro_alvo: number
  meta_mes: number
  meta_reserva: number
  licenca: string
  politicas: string
}

export const CONFIG_PADRAO: Omit<Config, 'user_id'> = {
  imposto: 0.054,
  taxa_cartao: 0.035,
  horas_mes: 100,
  lucro_alvo: 0.15,
  meta_mes: 15000,
  meta_reserva: 20000,
  licenca: '2027-02-01',
  politicas: '',
}
