import { brlPreco, duracao, espacoSimples } from './format'
import { CATEGORIAS, type Categoria, type Servico } from './types'

export const TITULO_GRUPO: Record<Categoria, string> = {
  Aplicação: 'Aplicações',
  Manutenção: 'Manutenções',
  'Lash lifting': 'Lash lifting',
  Penteado: 'Penteado',
  Outros: 'Outros',
}

export interface GrupoCatalogo {
  categoria: Categoria
  titulo: string
  itens: Servico[]
}

const ordemCategoria = (c: string) => {
  const i = CATEGORIAS.indexOf(c as Categoria)
  return i < 0 ? CATEGORIAS.length : i
}

export function ordenarServicos<T extends Pick<Servico, 'categoria' | 'ordem' | 'nome'>>(lista: T[]): T[] {
  return [...lista].sort(
    (a, b) =>
      ordemCategoria(a.categoria) - ordemCategoria(b.categoria) ||
      (a.ordem ?? 0) - (b.ordem ?? 0) ||
      a.nome.localeCompare(b.nome, 'pt-BR'),
  )
}

export function gruposCatalogo(servicos: Servico[]): GrupoCatalogo[] {
  // Preço especial (amigas, permuta) e serviço desativado nunca aparecem para a cliente.
  const visiveis = ordenarServicos(
    servicos.filter((s) => s.no_catalogo && s.ativo !== false && s.tipo_preco !== 'especial'),
  )
  return CATEGORIAS.map((categoria) => ({
    categoria,
    titulo: TITULO_GRUPO[categoria],
    itens: visiveis.filter((s) => s.categoria === categoria),
  })).filter((g) => g.itens.length > 0)
}

/** Texto formatado para colar no WhatsApp (*negrito*, _itálico_, bullets). */
export function textoWhatsApp(servicos: Servico[], politicas: string) {
  const linhas: string[] = ['✨ *ANDRADE CONCEPT* ✨', '_Tabela de valores · Método Hyper_']
  for (const g of gruposCatalogo(servicos)) {
    linhas.push('', `*${g.titulo.toUpperCase()}*`)
    for (const s of g.itens) {
      linhas.push(`• *${s.nome.trim()}* — ${brlPreco(s.preco)}`)
      const detalhe = [s.descricao?.trim(), s.minutos ? duracao(s.minutos) : ''].filter(Boolean).join(' · ')
      if (detalhe) linhas.push(`   _${detalhe}_`)
    }
  }
  const regras = politicas
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => '• ' + l.replace(/^[-•*]\s*/, ''))
  if (regras.length) linhas.push('', '*REGRAS DE ATENDIMENTO*', ...regras)
  return espacoSimples(linhas.join('\n'))
}
