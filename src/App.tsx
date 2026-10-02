import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigurado } from './lib/supabase'
import { DadosProvider } from './data/Dados'
import { Login } from './screens/Login'
import { Shell } from './Shell'
import { Logo } from './components/Logo'

export default function App() {
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    if (!supabaseConfigurado) return
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabaseConfigurado)
    return (
      <div className="tela-cheia">
        <h1 className="marca--centro">
          <Logo variante="positivo" grande />
        </h1>
        <p>
          Faltam as variáveis <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>. Veja o README.
        </p>
      </div>
    )
  if (sessao === undefined)
    return (
      <div className="tela-cheia">
        <p className="muted">Carregando…</p>
      </div>
    )
  if (!sessao) return <Login />
  return (
    <DadosProvider userId={sessao.user.id}>
      <Shell />
    </DadosProvider>
  )
}
