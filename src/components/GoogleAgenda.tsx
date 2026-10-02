import { useState } from 'react'
import type { EventoInterpretado } from '../lib/agendaGoogle'
import { brl0, diaSemana } from '../lib/format'
import type { useAgendaGoogle } from '../data/useAgendaGoogle'

type Google = ReturnType<typeof useAgendaGoogle>

/** Faixa de conexão: conectar, escolher a agenda, atualizar, desconectar. */
export function BarraGoogle({ g, pendentes }: { g: Google; pendentes: number }) {
  if (g.estado === 'desligado') return null

  if (g.estado !== 'conectado')
    return (
      <div className="google">
        <div className="google__texto">
          <b>Google Agenda</b>
          <span className="muted">
            {g.estado === 'expirado'
              ? 'A conexão vence a cada hora. Toque para trazer os horários de novo.'
              : 'Traga os horários marcados para registrar com um toque.'}
          </span>
          {g.erro && <span className="google__erro">Não conectou: {g.erro}.</span>}
        </div>
        <button type="button" className="btn btn--pequeno" onClick={g.conectar}>
          {g.estado === 'expirado' ? 'Reconectar' : 'Conectar'}
        </button>
      </div>
    )

  return (
    <div className="google">
      <div className="google__texto">
        <b>Google Agenda</b>
        <span className="muted" aria-live="polite">
          {g.carregando
            ? 'Buscando horários…'
            : g.erro
              ? `Não buscou: ${g.erro}.`
              : pendentes
                ? `${pendentes} ${pendentes === 1 ? 'horário' : 'horários'} para registrar neste mês`
                : 'Tudo da agenda deste mês já foi registrado'}
        </span>
      </div>
      <div className="google__acoes">
        {g.agendas.length > 1 && (
          <select
            aria-label="Qual agenda"
            className="google__agenda"
            value={g.agendaId}
            onChange={(e) => g.setAgendaId(e.target.value)}
          >
            {!g.agendas.some((a) => a.id === g.agendaId) && <option value={g.agendaId}>Agenda principal</option>}
            {g.agendas.map((a) => (
              <option key={a.id} value={a.principal ? 'primary' : a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        )}
        <button type="button" className="btn btn--fantasma btn--pequeno" onClick={g.atualizar} disabled={g.carregando}>
          Atualizar
        </button>
        <button type="button" className="btn btn--fantasma btn--pequeno" onClick={g.desconectar}>
          Desconectar
        </button>
      </div>
    </div>
  )
}

/** Importar de uma vez todos os horários prontos (até hoje, com serviço reconhecido). */
function ImportarTodos({
  quantos,
  ficam,
  onImportar,
}: {
  quantos: number
  ficam: string
  onImportar: () => Promise<void>
}) {
  const [confirmando, setConfirmando] = useState(false)
  const [importando, setImportando] = useState(false)
  if (!quantos) return ficam ? <p className="nota">{ficam}</p> : null

  return (
    <div className="importar">
      {!confirmando ? (
        <button type="button" className="btn btn--largo" onClick={() => setConfirmando(true)}>
          Importar {quantos} {quantos === 1 ? 'atendimento' : 'atendimentos'} até hoje
        </button>
      ) : (
        <div className="importar__confirmar" role="group" aria-label="Confirmar importação">
          <p>
            Registrar {quantos} {quantos === 1 ? 'atendimento' : 'atendimentos'} com o preço do serviço e pagamento{' '}
            <b>Pix</b>? Depois dá para editar cada um.
          </p>
          <div className="form__acoes">
            <button
              type="button"
              className="btn"
              disabled={importando}
              onClick={async () => {
                setImportando(true)
                await onImportar()
                setImportando(false)
                setConfirmando(false)
              }}
            >
              {importando ? 'Importando…' : 'Importar'}
            </button>
            <button type="button" className="btn btn--fantasma" onClick={() => setConfirmando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {ficam && <p className="nota">{ficam}</p>}
    </div>
  )
}

/** Horários da Google Agenda ainda sem atendimento registrado. */
export function ListaAgendados({
  eventos,
  mostrarDia,
  onRegistrar,
  importaveis,
  ficam,
  onImportarTodos,
}: {
  eventos: EventoInterpretado[]
  mostrarDia: boolean
  onRegistrar: (ev: EventoInterpretado) => void
  importaveis: number
  /** explica o que não entra na importação (futuros, sem serviço) */
  ficam: string
  onImportarTodos: () => Promise<void>
}) {
  if (!eventos.length) return null
  return (
    <div className="agendados">
      <div className="dia">
        <span>Na Google Agenda, falta registrar</span>
        <span className="num">{eventos.length}</span>
      </div>
      <ImportarTodos quantos={importaveis} ficam={ficam} onImportar={onImportarTodos} />
      <ul className="lista">
        {eventos.map((ev) => (
          <li key={ev.id} className="item item--agendado">
            <div className="item__info">
              <b>{ev.cliente || ev.titulo || 'Sem título'}</b>
              <span className="muted">
                {[
                  mostrarDia ? `${diaSemana(ev.data)}, ${ev.hora}` : ev.hora,
                  ev.servico
                    ? `${ev.servico.nome} · ${brl0(ev.servico.preco)}${ev.origem_servico === 'historico' ? ' (último que fez)' : ''}`
                    : 'cliente nova: escolha o serviço',
                ].join(' · ')}
              </span>
            </div>
            <button
              type="button"
              className="btn btn--pequeno"
              aria-label={`Registrar atendimento de ${ev.cliente || ev.titulo}`}
              onClick={() => onRegistrar(ev)}
            >
              Registrar
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
