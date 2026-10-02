import { useMemo } from 'react'
import { useDados } from '../data/Dados'
import { maisVendidos, progressoMeta, resultadoMes, separarCustos, serieFaturamento } from '../lib/calc'
import { brl, brl0, decimal, mesCurto, nomeMes, pct } from '../lib/format'
import { Barra, Kpi } from '../components/ui'
import { ResumoReservas } from './Reserva'

export function Painel({ mes }: { mes: string }) {
  const { atendimentos, custos, servicos, historico, config } = useDados()

  const doMes = useMemo(() => atendimentos.filter((a) => a.data.startsWith(mes)), [atendimentos, mes])
  const r = resultadoMes(doMes, config, separarCustos(custos))

  // Sem atendimentos no mês, estima pelo preço médio do catálogo.
  const precos = servicos
    .filter((s) => s.no_catalogo && s.ativo !== false && s.tipo_preco !== 'especial' && s.preco > 0)
    .map((s) => s.preco)
  const ticketRef = r.ticket ?? (precos.length ? precos.reduce((a, b) => a + b, 0) / precos.length : 0)
  const meta = progressoMeta(r.faturamento, config.meta_mes, ticketRef)

  const serie = useMemo(() => serieFaturamento(mes, 8, atendimentos, historico), [mes, atendimentos, historico])
  const maior = Math.max(1, ...serie.map((p) => p.total))
  const top = maisVendidos(doMes)

  return (
    <section>
      <h2>Painel de {nomeMes(mes)}</h2>
      <p className="lead">Quanto entrou, quanto custou e quanto sobrou.</p>

      <div className="grade grade--kpis">
        <Kpi
          rotulo="Faturamento"
          valor={brl0(r.faturamento)}
          sub={`${r.quantidade} ${r.quantidade === 1 ? 'atendimento' : 'atendimentos'}`}
        />
        <Kpi rotulo="Ticket médio" valor={r.ticket != null ? brl0(r.ticket) : '—'} sub="por atendimento" />
        <Kpi
          rotulo="Valor por hora"
          valor={r.por_hora != null ? brl0(r.por_hora) : '—'}
          sub={`${decimal(r.minutos / 60)} h trabalhadas`}
        />
        <Kpi
          rotulo={r.sobra >= 0 ? 'Sobra depois do salário' : 'Faltou para o salário'}
          valor={brl0(r.sobra)}
          sub={`lucro de ${brl0(r.lucro)} menos seu pró-labore`}
        />
      </div>

      <div className="grade grade--2">
        <div className="painel">
          <h3 className="h3--topo">Meta do mês</h3>
          <div className="linha-entre">
            <b className="num">
              {brl0(r.faturamento)} de {brl0(config.meta_mes)}
            </b>
            <span className="muted num">{pct(meta.progresso)}</span>
          </div>
          <Barra valor={meta.progresso} rotulo="Progresso da meta do mês" />
          <p className="nota">
            {meta.falta > 0
              ? `Faltam ${brl0(meta.falta)}: cerca de ${meta.atendimentos} ${meta.atendimentos === 1 ? 'atendimento' : 'atendimentos'} no ticket médio${r.ticket == null ? ' (estimado pelo catálogo)' : ''}.`
              : 'Meta batida.'}
          </p>
        </div>
        <div className="painel">
          <h3 className="h3--topo">Reservas</h3>
          <ResumoReservas />
        </div>
      </div>

      <h3>Faturamento dos últimos 8 meses</h3>
      <div className="painel">
        <div
          className="grafico"
          role="img"
          aria-label={serie.map((p) => `${nomeMes(p.mes)}: ${brl0(p.total)}`).join('; ')}
        >
          {serie.map((p) => (
            <div key={p.mes} className={`grafico__col ${p.mes === mes ? 'grafico__col--atual' : ''}`}>
              <b className="num">{p.total ? decimal(p.total / 1000) + 'k' : ''}</b>
              <i style={{ height: `${Math.max(2, (p.total / maior) * 100)}%` }} />
              <span>{mesCurto(p.mes)}</span>
            </div>
          ))}
        </div>
      </div>

      <h3>Resultado do mês</h3>
      <div className="tabela">
        <table>
          <tbody>
            <LinhaDre rotulo="Faturamento" valor={r.faturamento} forte />
            <LinhaDre rotulo={`Imposto (${pct(config.imposto)})`} valor={-r.imposto} />
            {config.taxa_cartao > 0 && (
              <LinhaDre rotulo={`Taxas de cartão (${pct(config.taxa_cartao)} no crédito e débito)`} valor={-r.taxas} />
            )}
            <LinhaDre rotulo="Material usado" valor={-r.material} />
            <LinhaDre rotulo="Custos do studio (salas já abatidas)" valor={-r.custos_studio} />
            <LinhaDre rotulo="Lucro da empresa" valor={r.lucro} forte />
            <LinhaDre rotulo="Seu pró-labore" valor={-r.pro_labore} />
            <LinhaDre rotulo="Sobra depois do salário" valor={r.sobra} forte />
          </tbody>
        </table>
      </div>

      <h3>O que mais saiu</h3>
      <div className="tabela">
        <table>
          <thead>
            <tr>
              <th>Serviço</th>
              <th className="d">Qtde</th>
              <th className="d">Total</th>
            </tr>
          </thead>
          <tbody>
            {top.length === 0 ? (
              <tr>
                <td colSpan={3} className="vazio">
                  Nenhum atendimento neste mês. Registre na aba Atendimentos.
                </td>
              </tr>
            ) : (
              top.map((t) => (
                <tr key={t.nome}>
                  <td>{t.nome}</td>
                  <td className="d num">{t.quantidade}</td>
                  <td className="d num">{brl0(t.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function LinhaDre({ rotulo, valor, forte }: { rotulo: string; valor: number; forte?: boolean }) {
  return (
    <tr className={forte ? 'forte' : ''}>
      <td>{rotulo}</td>
      <td className={`d num ${valor < 0 && !forte ? 'muted' : ''}`}>{brl(valor)}</td>
    </tr>
  )
}
