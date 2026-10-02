import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useDados } from '../data/Dados'
import { ordenarServicos } from '../lib/catalogo'
import { brl, brl0, diaSemana, hojeISO, nomeMes } from '../lib/format'
import { CATEGORIAS, PAGAMENTOS, type Atendimento, type Pagamento } from '../lib/types'
import { ConfirmButton, NumeroInput, Vazio } from '../components/ui'
import { Calendario } from '../components/Calendario'
import { BarraGoogle, ListaAgendados } from '../components/GoogleAgenda'
import { useAgendaGoogle } from '../data/useAgendaGoogle'
import { chaveNome, useClientes } from '../data/useClientes'
import {
  atendimentoDoEvento,
  interpretarEvento,
  separarParaImportar,
  type EventoInterpretado,
} from '../lib/agendaGoogle'

interface Form {
  data: string
  cliente: string
  servico_id: string
  valor: number | null
  pagamento: Pagamento
  obs: string
}

export function Atendimentos({ mes, setMes }: { mes: string; setMes: (m: string) => void }) {
  const { atendimentos, servicos, inserir, inserirVarios, atualizar, excluir } = useDados()
  const { clientes: fichas, idsDasClientes } = useClientes()
  const ordenados = useMemo(() => ordenarServicos(servicos), [servicos])
  // No formulário entram só os ativos; preço especial fica num grupo à parte.
  const ativos = ordenados.filter((s) => s.ativo !== false)
  const primeiro = ativos.find((s) => s.tipo_preco !== 'especial') ?? ativos[0]

  const vazio = (): Form => ({
    data: hojeISO(),
    cliente: '',
    servico_id: primeiro?.id ?? '',
    valor: primeiro?.preco ?? null,
    pagamento: 'Pix',
    obs: '',
  })
  const [f, setF] = useState<Form>(vazio)
  const [editando, setEditando] = useState<Atendimento | null>(null)
  const [salvando, setSalvando] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  // Autocompletar: fichas de clientes + nomes já usados em atendimentos.
  const clientes = useMemo(() => {
    const porChave = new Map<string, string>()
    for (const nome of [...fichas.map((c) => c.nome), ...atendimentos.map((a) => a.cliente)])
      if (nome.trim() && !porChave.has(chaveNome(nome))) porChave.set(chaveNome(nome), nome.trim())
    return [...porChave.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [fichas, atendimentos])

  // Dia escolhido no calendário; ao trocar de mês volta a mostrar o mês todo.
  const [diaEscolhido, setDiaEscolhido] = useState<string | null>(null)
  const diaSel = diaEscolhido?.startsWith(mes) ? diaEscolhido : null

  const doMes = useMemo(() => atendimentos.filter((a) => a.data.startsWith(mes)), [atendimentos, mes])
  const totalMes = doMes.reduce((s, a) => s + a.valor, 0)
  const contagem = useMemo(() => {
    const c = new Map<string, number>()
    for (const a of doMes) c.set(a.data, (c.get(a.data) ?? 0) + 1)
    return c
  }, [doMes])
  // Mês vazio: aponta o mês com atendimentos mais perto do escolhido.
  const mesComDados = useMemo(() => {
    if (doMes.length) return null
    const meses = [...new Set(atendimentos.map((a) => a.data.slice(0, 7)))]
    const distancia = (m: string) => {
      const [a1, m1] = m.split('-').map(Number)
      const [a2, m2] = mes.split('-').map(Number)
      return Math.abs((a1 - a2) * 12 + (m1 - m2))
    }
    return meses.sort((a, b) => distancia(a) - distancia(b) || b.localeCompare(a))[0] ?? null
  }, [atendimentos, doMes.length, mes])

  const dias = useMemo(() => {
    const g = new Map<string, Atendimento[]>()
    for (const a of doMes) if (!diaSel || a.data === diaSel) g.set(a.data, [...(g.get(a.data) ?? []), a])
    return [...g.entries()]
  }, [doMes, diaSel])

  // Google Agenda: horários do mês que ainda não viraram atendimento.
  const google = useAgendaGoogle(mes)
  const [daAgenda, setDaAgenda] = useState<EventoInterpretado | null>(null)
  const pendentes = useMemo(
    () =>
      google.eventos
        .map((ev) => interpretarEvento(ev, { servicos, clientes: fichas, atendimentos }))
        .filter((ev) => !ev.registrado)
        .sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora)),
    [google.eventos, servicos, fichas, atendimentos],
  )
  const agendados = useMemo(() => {
    const c = new Map<string, number>()
    for (const ev of pendentes) c.set(ev.data, (c.get(ev.data) ?? 0) + 1)
    return c
  }, [pendentes])
  const pendentesVisiveis = diaSel ? pendentes.filter((ev) => ev.data === diaSel) : pendentes

  // Importar todos: vale para o mês inteiro, mesmo com um dia selecionado.
  const separados = useMemo(() => separarParaImportar(pendentes, hojeISO()), [pendentes])
  const ficam = [
    separados.futuros.length &&
      `${separados.futuros.length} ${separados.futuros.length === 1 ? 'horário futuro fica' : 'horários futuros ficam'} para depois do dia`,
    separados.semServico.length &&
      `${separados.semServico.length} sem serviço (cliente nova) ${separados.semServico.length === 1 ? 'precisa' : 'precisam'} ser ${separados.semServico.length === 1 ? 'registrado' : 'registrados'} um a um`,
  ]
    .filter(Boolean)
    .join('; ')

  async function importarTodos() {
    const ids = await idsDasClientes(separados.prontos.map((ev) => ev.cliente))
    if (!ids) return
    const linhas = separados.prontos.map((ev) => ({
      ...atendimentoDoEvento({ ...ev, servico: ev.servico! }),
      cliente_id: ev.cliente_id ?? ids.get(chaveNome(ev.cliente)) ?? null,
    }))
    await inserirVarios(
      'atendimentos',
      linhas,
      `${linhas.length} ${linhas.length === 1 ? 'atendimento importado' : 'atendimentos importados'}`,
    )
  }

  function registrarDaAgenda(ev: EventoInterpretado) {
    setEditando(null)
    setDaAgenda(ev)
    setF((p) => ({
      data: ev.data,
      cliente: ev.cliente,
      servico_id: ev.servico?.id ?? p.servico_id,
      valor: ev.servico?.preco ?? p.valor,
      pagamento: 'Pix',
      obs: '',
    }))
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const servicoSelecionado = servicos.find((s) => s.id === f.servico_id)

  // Lê o valor já no evento; o updater roda depois e pode ver o campo restaurado.
  const mudar = (campo: 'data' | 'cliente' | 'pagamento' | 'obs') => (e: { target: { value: string } }) => {
    const v = e.target.value
    setF((p) => ({ ...p, [campo]: v }))
  }

  function escolherServico(id: string) {
    const s = servicos.find((x) => x.id === id)
    setF((p) => ({ ...p, servico_id: id, valor: s ? s.preco : p.valor }))
  }

  function cancelar() {
    setEditando(null)
    setDaAgenda(null)
    setF(vazio())
  }

  function editar(a: Atendimento) {
    setDaAgenda(null)
    setEditando(a)
    setF({
      data: a.data,
      cliente: a.cliente,
      servico_id: a.servico_id ?? '',
      valor: a.valor,
      pagamento: a.pagamento,
      obs: a.obs,
    })
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (f.valor == null) return
    // Nome, minutos e material são copiados do serviço na hora do registro.
    // Na edição, só recopia se o serviço foi trocado.
    const mesmoServico = editando && (editando.servico_id ?? '') === f.servico_id
    const s = servicoSelecionado
    const copia = mesmoServico
      ? {
          servico_nome: editando.servico_nome,
          categoria: editando.categoria,
          minutos: editando.minutos,
          material: editando.material,
        }
      : {
          servico_nome: s?.nome ?? '',
          categoria: s?.categoria ?? '',
          minutos: s?.minutos ?? 0,
          material: s?.material ?? 0,
        }
    setSalvando(true)
    // Liga à ficha da cliente (cria a ficha se for a primeira vez).
    const ids = await idsDasClientes([f.cliente])
    if (!ids) {
      setSalvando(false)
      return
    }
    const linha = {
      data: f.data,
      cliente: f.cliente.trim(),
      cliente_id: ids.get(chaveNome(f.cliente)) ?? null,
      servico_id: f.servico_id || null,
      ...copia,
      valor: f.valor,
      pagamento: f.pagamento,
      obs: f.obs.trim(),
    }
    if (editando) {
      const ok = await atualizar('atendimentos', editando.id, linha, 'Atendimento atualizado')
      if (ok) cancelar()
    } else {
      const fora = !f.data.startsWith(mes)
      const ok = await inserir(
        'atendimentos',
        linha,
        fora ? `Registrado em ${nomeMes(f.data.slice(0, 7))}` : 'Atendimento registrado',
      )
      if (ok) {
        setDaAgenda(null)
        setF((p) => ({ ...p, cliente: '', obs: '', pagamento: 'Pix', valor: s?.preco ?? p.valor }))
      }
    }
    setSalvando(false)
  }

  return (
    <section>
      <h2>Atendimentos</h2>
      <p className="lead">Registre cada cliente atendida. O valor vem do preço do serviço e pode ser alterado.</p>

      <form ref={formRef} className={`painel form ${editando ? 'form--editando' : ''}`} onSubmit={salvar}>
        {editando && <p className="form__aviso">Editando atendimento de {editando.cliente || 'cliente sem nome'}</p>}
        {daAgenda && (
          <p className="form__aviso">
            Da Google Agenda: “{daAgenda.titulo}”.{' '}
            {!daAgenda.servico
              ? 'Escolha o serviço, confira e registre.'
              : daAgenda.origem_servico === 'historico'
                ? `Serviço sugerido pelo último que ela fez (${daAgenda.servico.nome}): confira e registre.`
                : 'Confira o pagamento e toque em Registrar.'}
          </p>
        )}
        <label className="campo">
          Data
          <input type="date" required value={f.data} onChange={mudar('data')} />
        </label>
        <label className="campo campo--largo">
          Cliente
          <input
            type="text"
            list="lista-clientes"
            autoComplete="off"
            autoCapitalize="words"
            placeholder="Nome"
            required
            value={f.cliente}
            onChange={mudar('cliente')}
          />
        </label>
        <datalist id="lista-clientes">
          {clientes.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <label className="campo campo--largo">
          Serviço
          <select required value={f.servico_id} onChange={(e) => escolherServico(e.target.value)}>
            {f.servico_id === '' && (
              <option value="" disabled={!editando}>
                {editando ? `${editando.servico_nome} (serviço removido)` : 'Cadastre um serviço primeiro'}
              </option>
            )}
            {CATEGORIAS.map((cat) => {
              const doGrupo = ativos.filter((s) => s.categoria === cat && s.tipo_preco !== 'especial')
              if (!doGrupo.length) return null
              return (
                <optgroup key={cat} label={cat}>
                  {doGrupo.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} · {brl0(s.preco)}
                    </option>
                  ))}
                </optgroup>
              )
            })}
            {ativos.some((s) => s.tipo_preco === 'especial') && (
              <optgroup label="Preços especiais">
                {ativos
                  .filter((s) => s.tipo_preco === 'especial')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} · {brl0(s.preco)}
                    </option>
                  ))}
              </optgroup>
            )}
            {/* serviço desativado ainda aparece ao editar um atendimento antigo dele */}
            {f.servico_id && !ativos.some((s) => s.id === f.servico_id) && servicoSelecionado && (
              <option value={servicoSelecionado.id}>
                {servicoSelecionado.nome} · {brl0(servicoSelecionado.preco)} (desativado)
              </option>
            )}
          </select>
        </label>
        <label className="campo">
          Valor (R$)
          <NumeroInput required value={f.valor} onValor={(v) => setF((p) => ({ ...p, valor: v }))} />
        </label>
        <label className="campo">
          Pagamento
          <select value={f.pagamento} onChange={mudar('pagamento')}>
            {PAGAMENTOS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="campo campo--largo">
          Observação
          <input type="text" placeholder="opcional" value={f.obs} onChange={mudar('obs')} />
        </label>
        <div className="form__acoes">
          <button className="btn" type="submit" disabled={salvando || f.valor == null}>
            {editando ? 'Salvar alteração' : 'Registrar'}
          </button>
          {(editando || daAgenda) && (
            <button className="btn btn--fantasma" type="button" onClick={cancelar}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <h3>
        Agenda do mês · {brl(totalMes)}
      </h3>
      <div className="painel">
        <Calendario
          mes={mes}
          contagem={contagem}
          agendados={agendados}
          selecionado={diaSel}
          onSelecionar={setDiaEscolhido}
          onMudarMes={setMes}
        />
        <BarraGoogle g={google} pendentes={pendentes.length} />
      </div>
      {diaSel && (
        <div className="filtro-dia">
          <span>Mostrando só {diaSemana(diaSel)}</span>
          <button type="button" className="btn btn--fantasma btn--pequeno" onClick={() => setDiaEscolhido(null)}>
            Ver o mês todo
          </button>
        </div>
      )}
      <ListaAgendados
        eventos={pendentesVisiveis}
        mostrarDia={!diaSel}
        onRegistrar={registrarDaAgenda}
        importaveis={separados.prontos.length}
        ficam={ficam ? ficam + '.' : ''}
        onImportarTodos={importarTodos}
      />
      {dias.length === 0 ? (
        <Vazio>
          {diaSel ? 'Nenhum atendimento neste dia.' : 'Nenhum atendimento neste mês ainda.'}
          {!diaSel && mesComDados && (
            <>
              <br />
              <button type="button" className="btn btn--fantasma btn--pequeno vazio__ir" onClick={() => setMes(mesComDados)}>
                Ver {nomeMes(mesComDados)} ({atendimentos.filter((a) => a.data.startsWith(mesComDados)).length})
              </button>
            </>
          )}
        </Vazio>
      ) : (
        dias.map(([dia, lista]) => (
          <div key={dia}>
            <div className="dia">
              <span>{diaSemana(dia)}</span>
              <span className="num">{brl(lista.reduce((s, a) => s + a.valor, 0))}</span>
            </div>
            <ul className="lista">
              {lista.map((a) => (
                <li key={a.id} className={`item ${editando?.id === a.id ? 'item--ativo' : ''}`}>
                  <div className="item__info">
                    <b>{a.cliente || '—'}</b>
                    <span className="muted">{[a.servico_nome, a.pagamento, a.obs].filter(Boolean).join(' · ')}</span>
                  </div>
                  <div className="item__valor num">{brl(a.valor)}</div>
                  <div className="item__acoes">
                    <button
                      type="button"
                      className="btn btn--fantasma btn--pequeno"
                      aria-label={`Editar atendimento de ${a.cliente}`}
                      onClick={() => editar(a)}
                    >
                      Editar
                    </button>
                    <ConfirmButton
                      descricao={`Excluir atendimento de ${a.cliente}`}
                      onConfirm={async () => {
                        if (await excluir('atendimentos', a.id)) if (editando?.id === a.id) cancelar()
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  )
}
