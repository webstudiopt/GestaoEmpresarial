import { useMemo, useState, type FormEvent } from 'react'
import { useDados } from '../data/Dados'
import { fixosTotal, planoReserva, resumoReserva } from '../lib/calc'
import { brl, brl0, dataCurta, dataLonga, decimal, hojeISO, mesCurto, nomeMes, pct, somarMeses } from '../lib/format'
import type { ReservaObjetivo } from '../lib/types'
import { Barra, ConfirmButton, NumeroInput, TextoInput, Vazio } from '../components/ui'

/** Lançamentos, resumo e plano mês a mês de uma reserva. */
function useCalculoReserva(obj: ReservaObjetivo) {
  const { reserva, custos } = useDados()
  return useMemo(() => {
    const lancamentos = reserva.filter((l) => l.reserva_id === obj.id)
    const hoje = hojeISO()
    return {
      lancamentos,
      resumo: resumoReserva(lancamentos, obj.meta, obj.data_alvo, hoje, fixosTotal(custos)),
      plano: planoReserva(lancamentos, obj.meta, obj.data_alvo, hoje),
    }
  }, [reserva, custos, obj.id, obj.meta, obj.data_alvo])
}

/** Frase curta sobre o mês corrente. */
function fraseDoMes(p: ReturnType<typeof planoReserva>) {
  if (p.falta_mes > 0) return `Este mês: faltam ${brl0(p.falta_mes)} de ${brl0(p.parcela_atual)}.`
  if (p.meses_restantes > 1)
    return p.parcela_futura > 0
      ? `Parcela deste mês feita. Próximas: ${brl0(p.parcela_futura)} por mês.`
      : 'Meta atingida.'
  return 'Parcela deste mês feita.'
}

export function ResumoReserva({ obj, completo = false }: { obj: ReservaObjetivo; completo?: boolean }) {
  const { resumo: r, plano: p } = useCalculoReserva(obj)
  return (
    <div className="resumo">
      <div className="linha-entre">
        <b className="num">
          {brl0(r.total)} de {brl0(r.meta)}
        </b>
        <span className="muted num">{pct(r.progresso)}</span>
      </div>
      <Barra valor={r.progresso} rotulo={`Progresso da reserva ${obj.nome}`} />
      <p className="nota">
        {r.dias > 0 ? `${r.dias} dias até ${dataLonga(obj.data_alvo)}. ` : `Data da meta (${dataLonga(obj.data_alvo)}) chegou. `}
        {r.dias > 0 && (r.falta > 0 ? fraseDoMes(p) : 'Meta atingida.')}
      </p>
      {completo && (
        <p className="nota">
          Cobre <b className="num">{decimal(r.meses_cobertos)}</b>{' '}
          {r.meses_cobertos >= 0.95 && r.meses_cobertos < 1.05 ? 'mês' : 'meses'} de custos fixos (com seu pró-labore).
        </p>
      )}
    </div>
  )
}

/** Todas as reservas, resumidas (Painel). */
export function ResumoReservas() {
  const { reservas } = useDados()
  if (!reservas.length) return <p className="nota">Nenhuma reserva ainda. Crie na aba Reserva.</p>
  return (
    <div className="reservas-resumo">
      {reservas.map((obj) => (
        <div key={obj.id}>
          <p className="reservas-resumo__nome">{obj.nome}</p>
          <ResumoReserva obj={obj} />
        </div>
      ))}
    </div>
  )
}

const novaData = () => `${somarMeses(hojeISO().slice(0, 7), 6)}-01`

export function ReservaTela() {
  const { reservas, inserir, atualizar, excluir } = useDados()
  const [escolhida, setEscolhida] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const obj = reservas.find((r) => r.id === escolhida) ?? reservas[0] ?? null

  // Formulário de nova reserva
  const [nome, setNome] = useState('')
  const [meta, setMeta] = useState<number | null>(null)
  const [dataAlvo, setDataAlvo] = useState(novaData)
  const [salvando, setSalvando] = useState(false)

  async function criar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !meta) return
    setSalvando(true)
    const ordem = Math.max(0, ...reservas.map((r) => r.ordem)) + 1
    const nova = await inserir('reservas', { nome: nome.trim(), meta, data_alvo: dataAlvo, ordem }, 'Reserva criada')
    setSalvando(false)
    if (nova) {
      setEscolhida(nova.id)
      setCriando(false)
      setNome('')
      setMeta(null)
      setDataAlvo(novaData())
    }
  }

  const formNova = (
    <form className="painel form" onSubmit={criar}>
      <p className="form__aviso">Nova reserva</p>
      <label className="campo campo--largo">
        Nome
        <input
          type="text"
          required
          placeholder="Ex.: Reforma da sala"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </label>
      <label className="campo">
        Meta (R$)
        <NumeroInput required value={meta} onValor={setMeta} placeholder="0,00" />
      </label>
      <label className="campo">
        Até quando
        <input type="date" required value={dataAlvo} onChange={(e) => setDataAlvo(e.target.value)} />
      </label>
      <div className="form__acoes">
        <button className="btn" type="submit" disabled={salvando || !nome.trim() || !meta}>
          Criar reserva
        </button>
        {reservas.length > 0 && (
          <button className="btn btn--fantasma" type="button" onClick={() => setCriando(false)}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )

  return (
    <section>
      <h2>Reservas</h2>
      <p className="lead">Dinheiro separado para cada objetivo: a licença, uma reforma, um curso. Cada um com sua meta e data.</p>

      {reservas.length > 0 && (
        <div className="reservas-abas" role="tablist" aria-label="Reservas">
          {reservas.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={!criando && r.id === obj?.id}
              className="reservas-abas__item"
              onClick={() => {
                setEscolhida(r.id)
                setCriando(false)
              }}
            >
              {r.nome || 'Sem nome'}
            </button>
          ))}
          <button
            type="button"
            role="tab"
            aria-selected={criando}
            className="reservas-abas__item reservas-abas__nova"
            onClick={() => setCriando(true)}
          >
            + Nova reserva
          </button>
        </div>
      )}

      {criando || !obj ? (
        <>
          {!obj && <Vazio>Nenhuma reserva ainda. Crie a primeira abaixo.</Vazio>}
          {formNova}
        </>
      ) : (
        <DetalheReserva
          key={obj.id}
          obj={obj}
          onAtualizar={(patch) => atualizar('reservas', obj.id, patch)}
          onExcluir={async () => {
            if (await excluir('reservas', obj.id)) setEscolhida(null)
          }}
        />
      )}
    </section>
  )
}

function DetalheReserva({
  obj,
  onAtualizar,
  onExcluir,
}: {
  obj: ReservaObjetivo
  onAtualizar: (patch: Partial<ReservaObjetivo>) => Promise<boolean>
  onExcluir: () => Promise<void>
}) {
  const { inserir, excluir } = useDados()
  const { lancamentos, resumo } = useCalculoReserva(obj)
  const [data, setData] = useState(hojeISO)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!valor) return
    setSalvando(true)
    const ok = await inserir(
      'reserva',
      { reserva_id: obj.id, data, descricao: descricao.trim(), valor },
      `Guardado em ${obj.nome}`,
    )
    setSalvando(false)
    if (ok) {
      setDescricao('')
      setValor(null)
    }
  }

  return (
    <>
      <div className="painel form form--reserva">
        <label className="campo campo--largo">
          Nome
          <TextoInput value={obj.nome} onSalvar={(v) => (v.trim() ? onAtualizar({ nome: v.trim() }) : false)} />
        </label>
        <label className="campo">
          Meta (R$)
          <NumeroInput value={obj.meta} onSalvar={(v) => onAtualizar({ meta: v })} />
        </label>
        <label className="campo">
          Até quando
          <input
            type="date"
            value={obj.data_alvo}
            onChange={(e) => {
              if (e.target.value && e.target.value !== obj.data_alvo) onAtualizar({ data_alvo: e.target.value })
            }}
          />
        </label>
      </div>

      <div className="painel">
        <ResumoReserva obj={obj} completo />
      </div>

      <PrevisaoReserva obj={obj} />

      <h3>Guardar em {obj.nome}</h3>
      <form className="painel form" onSubmit={guardar}>
        <label className="campo">
          Data
          <input type="date" required value={data} onChange={(e) => setData(e.target.value)} />
        </label>
        <label className="campo campo--largo">
          Origem
          <input
            type="text"
            required
            placeholder="Ex.: aluguel das salas"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </label>
        <label className="campo">
          Valor (R$)
          <NumeroInput required value={valor} onValor={setValor} placeholder="0,00" />
        </label>
        <div className="form__acoes">
          <button className="btn" type="submit" disabled={salvando || !valor}>
            Guardar
          </button>
        </div>
      </form>

      <h3>Lançamentos · total {brl(resumo.total)}</h3>
      {lancamentos.length === 0 ? (
        <Vazio>Nada guardado ainda. Lance o primeiro valor acima.</Vazio>
      ) : (
        <ul className="lista">
          {lancamentos.map((x) => (
            <li key={x.id} className="item">
              <div className="item__info">
                <b>{x.descricao || '—'}</b>
                <span className="muted num">{dataCurta(x.data)}</span>
              </div>
              <div className="item__valor num">{brl(x.valor)}</div>
              <ConfirmButton descricao={`Excluir lançamento ${x.descricao}`} onConfirm={() => excluir('reserva', x.id)} />
            </li>
          ))}
        </ul>
      )}

      <div className="acoes-rodape reservas-excluir">
        <ConfirmButton
          rotulo="Excluir esta reserva"
          pergunta={
            lancamentos.length > 1
              ? `Excluir "${obj.nome}" e seus ${lancamentos.length} lançamentos?`
              : lancamentos.length === 1
                ? `Excluir "${obj.nome}" e o lançamento dela?`
                : `Excluir "${obj.nome}"?`
          }
          onConfirm={onExcluir}
        />
      </div>
    </>
  )
}

function PrevisaoReserva({ obj }: { obj: ReservaObjetivo }) {
  const { plano: p } = useCalculoReserva(obj)
  const atual = p.meses.find((m) => m.situacao === 'atual')
  if (!p.meses.length) return null

  return (
    <>
      <h3>Previsão até {dataLonga(obj.data_alvo)}</h3>
      {atual && (
        <div className="painel">
          <div className="linha-entre">
            <span className="muted">Guardar em {nomeMes(atual.mes)}</span>
            <b className="num previsao__valor">{brl0(atual.parcela)}</b>
          </div>
          <Barra
            valor={atual.parcela > 0 ? atual.guardado / atual.parcela : 1}
            rotulo={`Guardado em ${nomeMes(atual.mes)}`}
          />
          <p className="nota">
            {p.falta_mes > 0 ? (
              <>
                Já guardou <b className="num">{brl0(atual.guardado)}</b>, faltam{' '}
                <b className="num">{brl0(p.falta_mes)}</b>. Se guardar mais que isso, as próximas parcelas diminuem.
              </>
            ) : p.extra_mes > 0.5 && p.meses_restantes > 1 ? (
              <>
                Você guardou <b className="num">{brl0(p.extra_mes)}</b> a mais. As próximas parcelas caíram de{' '}
                <b className="num">{brl0(atual.parcela)}</b> para <b className="num">{brl0(p.parcela_futura)}</b>.
              </>
            ) : (
              'Parcela do mês completa.'
            )}
          </p>
        </div>
      )}

      <div className="tabela previsao">
        <table>
          <thead>
            <tr>
              <th>Mês</th>
              <th className="d">Guardar</th>
              <th className="d">Guardado</th>
            </tr>
          </thead>
          <tbody>
            {p.meses.map((m) => {
              const diferenca = m.guardado - m.parcela
              return (
                <tr key={m.mes} className={m.situacao === 'atual' ? 'previsao__atual' : ''}>
                  <td>
                    <div className="previsao__celula">
                      <span className="previsao__mes">
                        {mesCurto(m.mes)}/{m.mes.slice(2, 4)}
                      </span>
                      {m.situacao === 'passado' &&
                        (diferenca >= -0.5 ? (
                          <span className="selo selo--saudavel">
                            {diferenca > 0.5 ? `+${brl0(diferenca)}` : 'Cumprido'}
                          </span>
                        ) : (
                          <span className="selo selo--abaixo">Faltou {brl0(-diferenca)}</span>
                        ))}
                      {m.situacao === 'atual' && <span className="previsao__tag">este mês</span>}
                    </div>
                  </td>
                  <td className="d num">{brl0(m.parcela)}</td>
                  <td className="d num">{m.guardado ? brl0(m.guardado) : m.situacao === 'futuro' ? '—' : brl0(0)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="nota">
        As parcelas se recalculam sozinhas: o que falta para a meta é dividido pelos meses até a data. Guardou a mais, as
        próximas diminuem; guardou a menos, elas aumentam.
      </p>
    </>
  )
}
