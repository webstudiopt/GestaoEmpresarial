import { useState } from 'react'
import { useDados } from '../data/Dados'
import { useToast } from '../data/Toast'
import { gruposCatalogo, textoWhatsApp } from '../lib/catalogo'
import { brlPreco, duracao } from '../lib/format'
import { TextoInput, Vazio } from '../components/ui'

export function Catalogo() {
  const { servicos, config, salvarConfig } = useDados()
  const toast = useToast()
  const [politicas, setPoliticas] = useState(config.politicas)
  const [textoManual, setTextoManual] = useState<string | null>(null)
  const grupos = gruposCatalogo(servicos)
  const regras = politicas.split('\n').map((l) => l.trim().replace(/^[-•*]\s*/, '')).filter(Boolean)

  async function copiar() {
    const texto = textoWhatsApp(servicos, politicas)
    try {
      await navigator.clipboard.writeText(texto)
      setTextoManual(null)
      toast('Copiado! Cole no WhatsApp')
    } catch {
      // Sem permissão de área de transferência: mostra o texto para copiar à mão.
      setTextoManual(texto)
      toast('Não copiou sozinho: selecione o texto abaixo', 'erro')
    }
  }

  return (
    <section className="tela-catalogo">
      <h2>Catálogo</h2>
      <p className="lead">Montado com os serviços marcados “No catálogo” na aba Serviços.</p>

      <div className="acoes-rodape acoes-rodape--topo">
        <button className="btn" type="button" onClick={copiar}>
          Copiar texto para WhatsApp
        </button>
      </div>
      {textoManual && (
        <textarea
          className="texto-manual"
          readOnly
          rows={12}
          value={textoManual}
          aria-label="Texto do catálogo"
          onFocus={(e) => e.currentTarget.select()}
        />
      )}

      <article className="catalogo">
        <p className="catalogo__titulo">Andrade Concept</p>
        <p className="catalogo__sub">Tabela de valores · Método Hyper</p>
        {grupos.length === 0 && <Vazio>Marque “No catálogo” nos serviços para aparecerem aqui.</Vazio>}
        {grupos.map((g) => (
          <div key={g.categoria}>
            <h4 className="catalogo__grupo">{g.titulo}</h4>
            {g.itens.map((s) => (
              <div key={s.id} className="catalogo__item">
                <div>
                  {s.nome}
                  <small>{[s.descricao, s.minutos ? duracao(s.minutos) : ''].filter(Boolean).join(' · ')}</small>
                </div>
                <div className="catalogo__preco num">{brlPreco(s.preco)}</div>
              </div>
            ))}
          </div>
        ))}
        {regras.length > 0 && (
          <div className="catalogo__regras">
            <h4 className="catalogo__grupo">Regras de atendimento</h4>
            <ul>
              {regras.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </article>

      <label className="campo campo--bloco" htmlFor="politicas">
        Regras de atendimento (uma por linha; aparecem no fim do catálogo)
        <TextoInput
          id="politicas"
          multilinha
          rows={7}
          value={config.politicas}
          onValor={setPoliticas}
          onSalvar={(v) => salvarConfig({ politicas: v })}
        />
      </label>
    </section>
  )
}
