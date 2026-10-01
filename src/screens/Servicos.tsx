import { useMemo, useState } from 'react'
import { useDados } from '../data/Dados'
import { calcularServico, fixosTotal, horaCusto, type Parametros } from '../lib/calc'
import { ordenarServicos } from '../lib/catalogo'
import { brl, brl0, pct } from '../lib/format'
import { CATEGORIAS, type Categoria, type Servico } from '../lib/types'
import { ConfirmButton, NumeroInput, SeloSituacao, TextoInput, Vazio } from '../components/ui'

export function Servicos() {
  const { servicos, custos, config, inserir } = useDados()
  const hora = horaCusto(fixosTotal(custos), config.horas_mes)
  const lista = useMemo(() => ordenarServicos(servicos), [servicos])
  const [criando, setCriando] = useState(false)

  async function adicionar() {
    setCriando(true)
    const ordem = Math.max(0, ...servicos.map((s) => s.ordem)) + 1
    await inserir(
      'servicos',
      { nome: 'Novo serviço', categoria: 'Outros', preco: 0, minutos: 60, material: 0, descricao: '', no_catalogo: false, ordem },
      'Serviço criado: ajuste os campos',
    )
    setCriando(false)
    requestAnimationFrame(() =>
      document.querySelector('.servico:last-of-type')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    )
  }

  return (
    <section>
      <h2>Serviços e preços</h2>
      <p className="lead">
        Altere preço, tempo ou material e veja na hora se o serviço paga a hora de trabalho. <b>Mínimo</b> é o preço que
        cobre custo, imposto, taxa e a margem de lucro de {pct(config.lucro_alvo)}.
      </p>
      <p className="nota">
        Sua hora custa <b className="num">{brl(hora)}</b> (custos fixos ÷ {config.horas_mes} h por mês).
      </p>

      {lista.length === 0 ? (
        <Vazio>Nenhum serviço cadastrado.</Vazio>
      ) : (
        <div className="grade">
          {lista.map((s) => (
            <ServicoCard key={s.id} servico={s} params={config} hora={hora} />
          ))}
        </div>
      )}
      <div className="acoes-rodape">
        <button className="btn" type="button" onClick={adicionar} disabled={criando}>
          Adicionar serviço
        </button>
      </div>
    </section>
  )
}

function ServicoCard({ servico, params, hora }: { servico: Servico; params: Parametros; hora: number }) {
  const { atualizar, excluir } = useDados()
  // Rascunho para recalcular enquanto digita; grava ao sair do campo.
  const [rascunho, setRascunho] = useState<Partial<Servico>>({})
  const atual = { ...servico, ...rascunho }
  const c = calcularServico(atual, params, hora)
  const id = (k: string) => `sv-${servico.id}-${k}`

  async function salvar<K extends keyof Servico>(campo: K, valor: Servico[K]) {
    const ok =
      servico[campo] === valor || (await atualizar('servicos', servico.id, { [campo]: valor } as Partial<Servico>))
    setRascunho(({ [campo]: _, ...resto }) => resto)
    return ok
  }
  const rascunhar = <K extends keyof Servico>(campo: K, valor: Servico[K] | null) => {
    if (valor != null) setRascunho((r) => ({ ...r, [campo]: valor }))
  }

  return (
    <article className="servico" aria-label={servico.nome}>
      <div className="servico__campos">
        <label className="campo servico__nome" htmlFor={id('nome')}>
          Nome
          <TextoInput id={id('nome')} value={servico.nome} onSalvar={(v) => (v.trim() ? salvar('nome', v.trim()) : false)} />
        </label>
        <label className="campo" htmlFor={id('cat')}>
          Categoria
          <select
            id={id('cat')}
            value={servico.categoria}
            onChange={(e) => salvar('categoria', e.target.value as Categoria)}
          >
            {CATEGORIAS.map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </select>
        </label>
        <label className="campo" htmlFor={id('preco')}>
          Preço (R$)
          <NumeroInput
            id={id('preco')}
            value={servico.preco}
            onValor={(v) => rascunhar('preco', v)}
            onSalvar={(v) => salvar('preco', v)}
          />
        </label>
        <label className="campo" htmlFor={id('min')}>
          Tempo (min)
          <NumeroInput
            id={id('min')}
            casas={0}
            inputMode="numeric"
            value={servico.minutos}
            onValor={(v) => rascunhar('minutos', v == null ? null : Math.round(v))}
            onSalvar={(v) => salvar('minutos', Math.round(v))}
          />
        </label>
        <label className="campo" htmlFor={id('mat')}>
          Material (R$)
          <NumeroInput
            id={id('mat')}
            value={servico.material}
            onValor={(v) => rascunhar('material', v)}
            onSalvar={(v) => salvar('material', v)}
          />
        </label>
        <label className="campo servico__desc" htmlFor={id('desc')}>
          Descrição no catálogo
          <TextoInput id={id('desc')} value={servico.descricao} onSalvar={(v) => salvar('descricao', v.trim())} />
        </label>
      </div>

      <dl className="servico__calc">
        <div className="servico__selo">
          <SeloSituacao selo={c.selo} />
        </div>
        <div>
          <dt>Custo real</dt>
          <dd className="num">{brl0(c.custo_real)}</dd>
        </div>
        <div>
          <dt>Mínimo</dt>
          <dd className="num">{Number.isFinite(c.minimo) ? brl0(c.minimo) : '—'}</dd>
        </div>
        <div>
          <dt>Por hora</dt>
          <dd className="num">{brl0(c.por_hora)}</dd>
        </div>
        <div>
          <dt>Lucro</dt>
          <dd className="num">
            {brl0(c.lucro)} ({pct(c.margem)})
          </dd>
        </div>
      </dl>

      <div className="servico__rodape">
        <label className="check">
          <input type="checkbox" checked={servico.no_catalogo} onChange={(e) => salvar('no_catalogo', e.target.checked)} />
          No catálogo
        </label>
        <ConfirmButton
          rotulo="Remover"
          pergunta="Remover serviço?"
          descricao={`Remover ${servico.nome}`}
          onConfirm={() => excluir('servicos', servico.id)}
        />
      </div>
    </article>
  )
}
