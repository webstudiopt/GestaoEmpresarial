import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigurado = Boolean(url && anonKey)

export const supabase = createClient(url || 'http://localhost', anonKey || 'sem-chave', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'andrade-concept-auth',
  },
})

/** Mensagem curta e em português para mostrar no aviso. */
export function motivoErro(err: unknown): string {
  const msg =
    typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : String(err)
  if (/failed to fetch|network|load failed/i.test(msg)) return 'sem conexão com a internet'
  if (/invalid login credentials/i.test(msg)) return 'e-mail ou senha incorretos'
  if (/email not confirmed/i.test(msg)) return 'e-mail ainda não confirmado'
  if (/duplicate key|unique/i.test(msg)) return 'já existe um registro igual'
  if (/row-level security|permission denied/i.test(msg)) return 'sem permissão (sessão expirada?)'
  if (/check constraint/i.test(msg)) return 'valor fora do permitido'
  if (/JWT expired/i.test(msg)) return 'sessão expirada, entre de novo'
  if (/does not exist|could not find the table|schema cache/i.test(msg))
    return 'o banco está desatualizado: rode o último arquivo supabase/migracao-*.sql no Supabase'
  return msg || 'erro desconhecido'
}
