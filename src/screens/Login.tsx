import { useState, type FormEvent } from 'react'
import { motivoErro, supabase } from '../lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEntrando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    setEntrando(false)
    if (error) setErro(motivoErro(error))
  }

  return (
    <main className="login">
      <form className="login__caixa" onSubmit={entrar}>
        <div className="marca marca--centro">
          <small>Studio · Santa Bárbara MG</small>
          <h1 className="marca__nome">Andrade Concept</h1>
        </div>
        <label className="campo">
          E-mail
          <input
            type="email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="campo">
          Senha
          <input
            type="password"
            autoComplete="current-password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </label>
        {erro && (
          <p className="login__erro" role="alert">
            Não entrou: {erro}.
          </p>
        )}
        <button className="btn btn--largo" type="submit" disabled={entrando}>
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
