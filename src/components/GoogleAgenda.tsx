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

/** Horários da Google Agenda ainda sem atendimento registrado. */
export function ListaAgendados({
  eventos,
  mostrarDia,
  onRegistrar,
}: {
  eventos: EventoInterpretado[]
  mostrarDia: boolean
  onRegistrar: (ev: EventoInterpretado) => void
}) {
  if (!eventos.length) return null
  return (
    <div className="agendados">
      <div className="dia">
        <span>Na Google Agenda, falta registrar</span>
        <span className="num">{eventos.length}</span>
      </div>
      <ul className="lista">
        {eventos.map((ev) => (
          <li key={ev.id} className="item item--agendado">
            <div className="item__info">
              <b>{ev.cliente || ev.titulo || 'Sem título'}</b>
              <span className="muted">
                {[
                  mostrarDia ? `${diaSemana(ev.data)}, ${ev.hora}` : ev.hora,
                  ev.servico ? `${ev.servico.nome} · ${brl0(ev.servico.preco)}` : 'serviço não reconhecido',
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
