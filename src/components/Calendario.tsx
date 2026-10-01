import { hojeISO, mesAtual, nomeMes, somarMeses } from '../lib/format'

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const SEMANA_LONGA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

/**
 * Grade do mês. Cada dia mostra quantos atendimentos teve;
 * tocar no dia seleciona (tocar de novo volta para o mês todo).
 */
export function Calendario({
  mes,
  contagem,
  agendados,
  selecionado,
  onSelecionar,
  onMudarMes,
}: {
  mes: string // YYYY-MM
  contagem: Map<string, number>
  /** horários da Google Agenda ainda não registrados, por dia */
  agendados?: Map<string, number>
  selecionado: string | null
  onSelecionar: (dia: string | null) => void
  onMudarMes: (mes: string) => void
}) {
  const [a, m] = mes.split('-').map(Number)
  const primeiroDiaSemana = new Date(a, m - 1, 1).getDay()
  const diasNoMes = new Date(a, m, 0).getDate()
  const hoje = hojeISO()

  const celulas: (string | null)[] = [
    ...Array<null>(primeiroDiaSemana).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`),
  ]

  const total = [...contagem.values()].reduce((s, n) => s + n, 0)
  const ehMesAtual = mes === mesAtual()

  return (
    <div className="calendario">
      <div className="calendario__topo">
        <button
          type="button"
          className="calendario__seta"
          aria-label="Mês anterior"
          onClick={() => onMudarMes(somarMeses(mes, -1))}
        >
          ‹
        </button>
        <div className="calendario__titulo" aria-live="polite">
          <b>{nomeMes(mes)}</b>
          <span className="muted">
            {total ? `${total} ${total === 1 ? 'atendimento' : 'atendimentos'}` : 'sem atendimentos'}
          </span>
        </div>
        <button
          type="button"
          className="calendario__seta"
          aria-label="Próximo mês"
          onClick={() => onMudarMes(somarMeses(mes, 1))}
        >
          ›
        </button>
      </div>
      {!ehMesAtual && (
        <div className="calendario__hoje">
          <button type="button" className="btn btn--fantasma btn--pequeno" onClick={() => onMudarMes(mesAtual())}>
            Voltar para hoje
          </button>
        </div>
      )}
      <div role="grid" aria-label={`Calendário de ${nomeMes(mes)}`}>
        <div className="calendario__semana" role="row">
          {SEMANA.map((d, i) => (
            <span key={i} role="columnheader" aria-label={SEMANA_LONGA[i]}>
              {d}
            </span>
          ))}
        </div>
        <div className="calendario__dias" role="row">
          {celulas.map((dia, i) => {
            if (!dia) return <span key={`v${i}`} aria-hidden="true" />
            const n = contagem.get(dia) ?? 0
            const ag = agendados?.get(dia) ?? 0
            const classes = [
              'calendario__dia',
              n ? 'calendario__dia--cheio' : '',
              dia === hoje ? 'calendario__dia--hoje' : '',
              dia === selecionado ? 'calendario__dia--sel' : '',
            ].join(' ')
            return (
              <button
                key={dia}
                type="button"
                role="gridcell"
                className={classes}
                aria-pressed={dia === selecionado}
                aria-label={`Dia ${Number(dia.slice(8))}: ${n ? `${n} ${n === 1 ? 'atendimento' : 'atendimentos'}` : 'sem atendimentos'}${ag ? `, ${ag} na agenda para registrar` : ''}`}
                onClick={() => onSelecionar(dia === selecionado ? null : dia)}
              >
                <span className="calendario__num">{Number(dia.slice(8))}</span>
                {n > 0 && <span className="calendario__qtd num">{n}</span>}
                {ag > 0 && <span className="calendario__agendado" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
