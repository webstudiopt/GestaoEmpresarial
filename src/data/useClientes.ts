import { useCallback } from 'react'
import { useDados } from './Dados'

/** Mesma chave do índice único do banco: lower(nome), sem espaços nas pontas. */
export const chaveNome = (nome: string) => nome.trim().toLowerCase()

/**
 * Liga atendimentos à ficha da cliente (atendimentos.cliente_id).
 * Acha a cliente pelo nome; quem ainda não tem ficha ganha uma, sem aviso na tela.
 */
export function useClientes() {
  const { clientes, inserirVarios } = useDados()

  /** nome → id da cliente, criando as que faltam. null se a gravação falhar. */
  const idsDasClientes = useCallback(
    async (nomes: string[]): Promise<Map<string, string> | null> => {
      const mapa = new Map(clientes.map((c) => [chaveNome(c.nome), c.id]))
      const faltam = new Map<string, string>()
      for (const nome of nomes) {
        const k = chaveNome(nome)
        if (k && !mapa.has(k) && !faltam.has(k)) faltam.set(k, nome.trim())
      }
      if (faltam.size) {
        const criadas = await inserirVarios(
          'clientes',
          [...faltam.values()].map((nome) => ({ nome })),
          '',
        )
        if (!criadas) return null
        for (const c of criadas) mapa.set(chaveNome(c.nome), c.id)
      }
      return mapa
    },
    [clientes, inserirVarios],
  )

  return { clientes, idsDasClientes }
}
