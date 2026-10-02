import { useMemo, useState } from 'react'
import { useDados } from '../data/Dados'
import { calcularServico, horasCusto, separarCustos, type HorasCusto } from '../lib/calc'
import { ordenarServicos } from '../lib/catalogo'
import { brl, brl0, pct } from '../lib/format'
import { CATEGORIAS, type Categoria, type Config, type Servico, type TipoPreco } from '../lib/types'
import { ConfirmButton, NumeroInput, SeloSituacao, TextoInput, Vazio } from '../components/ui'

export function Servicos() {
  const { servicos, custos, config, inserir } = useDados()
  const horas = horasCusto(separarCustos(custos), config.horas_mes)
  const lista = useMemo(() => ordenarServicos(servicos), [servicos])
  const padrao = lista.filter((s) => s.tipo_preco !== 'especial')
  const especiais = lista.filter((s) => s.tipo_preco === 'especial')
  const [criando, setCriando] = useState(false)

  async function adicionar(tipo_preco: TipoPreco) {
    setCriando(true)
    const ordem = Math.max(0, ...servicos.map((s) => s.ordem)) + 1
    await inserir(
      'servicos',
      {
        nome: tipo_preco === 'especial' ? 'Novo preço especial' : 'Novo serviço',
        categoria: 'Aplicação',
        tipo_preco,
        preco: 0,
        minutos: 60,
        material: 0,
        descricao: '',
        regra: tipo_preco === 'especial' ? 'Preço especial, fora do catálogo.' : '',
        no_catalogo: false,
        ativo: true,
        ordem,
      },
      'Serviço criado: ajuste os campos',
    )
    setCriando(false)
  }

  return (
    <section>
      <h2>Serviços e preços</h2>
      <p className="lead">
        Altere preço, tempo ou material e veja na hora se o serviço paga o studio e a sua hora. O <b>lucro</b> é antes do
        seu salário; <b>depois do salário</b> é o que sobra para a empresa.
      </p>
      <p className="nota">
        Cada hora de atendimento custa <b className="num">{brl(horas.hora_studio)}</b> de studio e{' '}
        <b className="num">{brl(horas.hora_pro_labore)}</b> do seu pró-labore ({config.horas_mes} h por mês). A taxa da
        maquininha é repassada para a cliente.
      </p>

      <h3>Tabela da cliente</h3>
      {padrao.length === 0 ? (
        <Vazio>Nenhum serviço cadastrado.</Vazio>
      ) : (
        <div className="grade">
          {padrao.map((s) => (
            <ServicoCard key={s.id} servico={s} config={config} horas={horas} />
          ))}
        </div>
      )}
      <div className="acoes-rodape">
        <button className="btn" type="button" onClick={() => adicionar('padrao')} disabled={criando}>
          Adicionar serviço
        </button>
      </div>

      <h3>Preços especiais</h3>
      <p className="nota">Amigas próximas, permuta e casos combinados. Nunca aparecem no catálogo.</p>
      {especiais.length === 0 ? (
        <Vazio>Nenhum preço especial.</Vazio>
      ) : (
        <div className="grade">
          {especiais.map((s) => (
            <ServicoCard key={s.id} servico={s} config={config} horas={horas} />
          ))}
        </div>
      )}
      <div className="acoes-rodape">
        <button className="btn btn--fantasma" type="button" onClick={() => adicionar('especial')} disabled={criando}>
          Adicionar preço especial
        </button>
      </div>
    </section>
  )
}

function ServicoCard({ servico, config, horas }: { servico: Servico; config: Config; horas: HorasCusto }) {
  const { atualizar, excluir } = useDados()
  // Rascunho para recalcular enquanto digita; grava ao sair do campo.
  const [rascunho, setRascunho] = useState<Partial<Servico>>({})
  const atual = { ...servico, ...rascunho }
  const c = calcularServico(atual, config, horas)
  const especial = servico.tipo_preco === 'especial'
  const id = (k: string) => `sv-${servico.id}-${k}`

  async function salvar(patch: Partial<Servico>) {
    const mudou = (Object.keys(patch) as (keyof Servico)[]).some((k) => servico[k] !== patch[k])
    const ok = !mudou || (await atualizar('servicos', servico.id, patch))
    setRascunho((r) => {
      const resto = { ...r }
      for (const k of Object.keys(patch)) delete resto[k as keyof Servico]
      return resto
    })
    return ok
  }
  const rascunhar = <K extends keyof Servico>(campo: K, valor: Servico[K] | null) => {
    if (valor != null) setRascunho((r) => ({ ...r, [campo]: valor }))
  }

  return (
    <article className={`servico ${servico.ativo ? '' : 'servico--inativo'}`} aria-label={servico.nome}>
      <div className="servico__campos">
        <label className="campo servico__nome" htmlFor={id('nome')}>
          Nome
          <TextoInput
            id={id('nome')}
            value={servico.nome}
            onSalvar={(v) => (v.trim() ? salvar({ nome: v.trim() }) : false)}
          />
        </label>
        <label className="campo" htmlFor={id('cat')}>
          Categoria
          <select id={id('cat')} value={servico.categoria} onChange={(e) => salvar({ categoria: e.target.value as Categoria })}>
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
            onSalvar={(v) => salvar({ preco: v })}
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
            onSalvar={(v) => salvar({ minutos: Math.round(v) })}
          />
        </label>
        <label className="campo" htmlFor={id('mat')}>
          Material (R$)
          <NumeroInput
            id={id('mat')}
            value={servico.material}
            onValor={(v) => rascunhar('material', v)}
            onSalvar={(v) => salvar({ material: v })}
          />
        </label>
        {!especial && (
          <label className="campo servico__desc" htmlFor={id('desc')}>
            Descrição no catálogo
            <TextoInput id={id('desc')} value={servico.descricao} onSalvar={(v) => salvar({ descricao: v.trim() })} />
          </label>
        )}
        <label className="campo servico__desc" htmlFor={id('regra')}>
          Regra (para você, não vai para o catálogo)
          <TextoInput
            id={id('regra')}
            value={servico.regra}
            placeholder={especial ? 'Ex.: só para amigas próximas' : 'Ex.: até 20 dias, com 50% dos fios'}
            onSalvar={(v) => salvar({ regra: v.trim() })}
          />
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
          <dt>Lucro</dt>
          <dd className="num">
            {brl0(c.lucro)} ({pct(c.margem)})
          </dd>
        </div>
        <div>
          <dt>Lucro por hora</dt>
          <dd className="num">{brl0(c.lucro_por_hora)}</dd>
        </div>
        <div>
          <dt>Depois do salário</dt>
          <dd className="num">{brl0(c.sobra_apos_salario)}</dd>
        </div>
        <div>
          <dt>Preço mínimo</dt>
          <dd className="num">{Number.isFinite(c.preco_minimo) ? brl0(c.preco_minimo) : '—'}</dd>
        </div>
      </dl>

      <div className="servico__rodape">
        <div className="servico__opcoes">
          <label className="check">
            <input
              type="checkbox"
              checked={servico.ativo}
              onChange={(e) => salvar({ ativo: e.target.checked })}
            />
            Ativo
          </label>
          {!especial && (
            <label className="check">
              <input
                type="checkbox"
                checked={servico.no_catalogo}
                onChange={(e) => salvar({ no_catalogo: e.target.checked })}
              />
              No catálogo
            </label>
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={especial}
              onChange={(e) =>
                salvar(e.target.checked ? { tipo_preco: 'especial', no_catalogo: false } : { tipo_preco: 'padrao' })
              }
            />
            Preço especial
          </label>
        </div>
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
