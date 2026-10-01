import { useState } from 'react'
import { useDados } from '../data/Dados'
import { fixosTotal, horaCusto } from '../lib/calc'
import { brl, mesAtual, nomeMes, somarMeses } from '../lib/format'
import type { Config } from '../lib/types'
import { ConfirmButton, NumeroInput, TextoInput, Vazio } from '../components/ui'

type CampoNumero = keyof Pick<Config, 'imposto' | 'taxa_cartao' | 'lucro_alvo' | 'horas_mes' | 'meta_mes'>

// fator: o banco guarda 0,054; a tela mostra 5,4 (%)
const PARAMETROS: { campo: CampoNumero; rotulo: string; fator: number; casas: number }[] = [
  { campo: 'imposto', rotulo: 'Imposto sobre faturamento (%)', fator: 100, casas: 2 },
  { campo: 'taxa_cartao', rotulo: 'Taxa da maquininha (%)', fator: 100, casas: 2 },
  { campo: 'lucro_alvo', rotulo: 'Margem de lucro desejada (%)', fator: 100, casas: 2 },
  { campo: 'horas_mes', rotulo: 'Horas de atendimento por mês', fator: 1, casas: 0 },
  { campo: 'meta_mes', rotulo: 'Meta de faturamento do mês (R$)', fator: 1, casas: 2 },
]

export function Custos() {
  const { custos, historico, config, salvarConfig, inserir, atualizar, excluir } = useDados()
  const total = fixosTotal(custos)
  const [criando, setCriando] = useState(false)

  async function novoCusto() {
    setCriando(true)
    await inserir('custos', { nome: 'Novo custo', valor: 0, ordem: Math.max(0, ...custos.map((c) => c.ordem)) + 1 })
    setCriando(false)
  }

  async function novoMesHistorico() {
    // Sugere o mês anterior ao mais antigo já lançado (ou o mês passado).
    const usados = new Set(historico.map((h) => h.mes))
    let mes = historico.length ? somarMeses(historico[0].mes, -1) : somarMeses(mesAtual(), -1)
    while (usados.has(mes)) mes = somarMeses(mes, -1)
    await inserir('historico', { mes, total: 0 })
  }

  return (
    <section>
      <h2>Custos e parâmetros</h2>
      <p className="lead">Custos fixos mensais e os números que entram no cálculo de preço.</p>

      <div className="painel form form--parametros">
        {PARAMETROS.map(({ campo, rotulo, fator, casas }) => (
          <label key={campo} className="campo">
            {rotulo}
            <NumeroInput
              casas={casas}
              value={config[campo] * fator}
              onSalvar={(v) => {
                if (campo === 'horas_mes' && v < 1) return false
                return salvarConfig({ [campo]: casas === 0 ? Math.round(v) : v / fator })
              }}
            />
          </label>
        ))}
      </div>
      <p className="nota">
        Com esses números, sua hora custa <b className="num">{brl(horaCusto(total, config.horas_mes))}</b>. Meta e data
        de cada reserva ficam na aba Reserva.
      </p>

      <h3>Custos fixos mensais</h3>
      {custos.length === 0 ? (
        <Vazio>Nenhum custo cadastrado.</Vazio>
      ) : (
        <div className="tabela">
          <table className="tabela-editavel">
            <thead>
              <tr>
                <th>Custo</th>
                <th className="d">Valor/mês</th>
                <th>
                  <span className="sr">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {custos.map((c) => (
                <tr key={c.id}>
                  <td>
                    <TextoInput
                      aria-label="Nome do custo"
                      value={c.nome}
                      onSalvar={(v) => (v.trim() ? atualizar('custos', c.id, { nome: v.trim() }) : false)}
                    />
                  </td>
                  <td className="d col-valor">
                    <NumeroInput
                      aria-label={`Valor de ${c.nome}`}
                      className="d"
                      value={c.valor}
                      onSalvar={(v) => atualizar('custos', c.id, { valor: v })}
                    />
                  </td>
                  <td className="d col-acao">
                    <ConfirmButton descricao={`Excluir ${c.nome}`} onConfirm={() => excluir('custos', c.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="forte">
                <td>Total</td>
                <td className="d num">{brl(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <div className="acoes-rodape">
        <button className="btn" type="button" onClick={novoCusto} disabled={criando}>
          Adicionar custo
        </button>
      </div>

      <h3>Faturamento antes do app</h3>
      <p className="nota">
        Usado no gráfico do Painel para os meses sem atendimentos registrados.
      </p>
      {historico.length === 0 ? (
        <Vazio>Nenhum mês lançado.</Vazio>
      ) : (
        <div className="tabela">
          <table className="tabela-editavel">
            <thead>
              <tr>
                <th>Mês</th>
                <th className="d">Faturamento</th>
                <th>
                  <span className="sr">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {historico.map((h) => (
                <tr key={h.id}>
                  <td>
                    <input
                      type="month"
                      aria-label="Mês"
                      value={h.mes}
                      onChange={(e) => {
                        if (e.target.value && e.target.value !== h.mes) atualizar('historico', h.id, { mes: e.target.value })
                      }}
                    />
                  </td>
                  <td className="d col-valor">
                    <NumeroInput
                      aria-label={`Faturamento de ${nomeMes(h.mes)}`}
                      className="d"
                      value={h.total}
                      onSalvar={(v) => atualizar('historico', h.id, { total: v })}
                    />
                  </td>
                  <td className="d col-acao">
                    <ConfirmButton descricao={`Excluir ${nomeMes(h.mes)}`} onConfirm={() => excluir('historico', h.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="acoes-rodape">
        <button className="btn btn--fantasma" type="button" onClick={novoMesHistorico}>
          Adicionar mês
        </button>
      </div>
    </section>
  )
}
