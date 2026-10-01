import { useEffect, useState, type ComponentType } from 'react'
import { supabase } from './lib/supabase'
import { mesAtual, nomeMes, somarMeses } from './lib/format'
import {
  IconeAtendimentos,
  IconeCatalogo,
  IconeCustos,
  IconePainel,
  IconeReserva,
  IconeServicos,
} from './components/Icones'
import { Painel } from './screens/Painel'
import { Atendimentos } from './screens/Atendimentos'
import { Servicos } from './screens/Servicos'
import { Custos } from './screens/Custos'
import { ReservaTela } from './screens/Reserva'
import { Catalogo } from './screens/Catalogo'

const ABAS = [
  { id: 'painel', rotulo: 'Painel', curto: 'Painel', Icone: IconePainel },
  { id: 'atendimentos', rotulo: 'Atendimentos', curto: 'Atend.', Icone: IconeAtendimentos },
  { id: 'servicos', rotulo: 'Serviços', curto: 'Serviços', Icone: IconeServicos },
  { id: 'custos', rotulo: 'Custos', curto: 'Custos', Icone: IconeCustos },
  { id: 'reserva', rotulo: 'Reserva', curto: 'Reserva', Icone: IconeReserva },
  { id: 'catalogo', rotulo: 'Catálogo', curto: 'Catálogo', Icone: IconeCatalogo },
] as const
type Aba = (typeof ABAS)[number]['id']

const TELAS: Record<Aba, ComponentType<{ mes: string; setMes: (m: string) => void }>> = {
  painel: Painel,
  atendimentos: Atendimentos,
  servicos: Servicos,
  custos: Custos,
  reserva: ReservaTela,
  catalogo: Catalogo,
}

// A aba fica no hash (#/painel) para sobreviver ao refresh no GitHub Pages.
function abaDoHash(): Aba {
  const h = window.location.hash.replace(/^#\/?/, '')
  return (ABAS.find((a) => a.id === h)?.id ?? 'painel') as Aba
}

export function Shell() {
  const [aba, setAba] = useState<Aba>(abaDoHash)
  const [mes, setMes] = useState(mesAtual)

  useEffect(() => {
    const f = () => setAba(abaDoHash())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])

  function irPara(a: Aba) {
    if (a === aba) return
    window.location.hash = '/' + a
    window.scrollTo({ top: 0 })
  }

  const Tela = TELAS[aba]
  const usaMes = aba === 'painel' || aba === 'atendimentos'

  return (
    <div className="app">
      <header className="topo">
        <div className="marca">
          <small>Studio · Santa Bárbara MG</small>
          <h1 className="marca__nome">Andrade Concept</h1>
        </div>
        <div className="topo__acoes">
          <div className={`mes ${usaMes ? '' : 'mes--inativo'}`} role="group" aria-label="Mês">
            <button type="button" className="mes__seta" aria-label="Mês anterior" onClick={() => setMes(somarMeses(mes, -1))}>
              ‹
            </button>
            <label className="mes__rotulo">
              <span className="mes__texto">{nomeMes(mes)}</span>
              <input
                type="month"
                className="mes__input"
                aria-label="Escolher mês"
                value={mes}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker?.()
                  } catch {
                    /* navegador sem showPicker: o foco basta */
                  }
                }}
                onChange={(e) => e.target.value && setMes(e.target.value)}
              />
            </label>
            <button type="button" className="mes__seta" aria-label="Próximo mês" onClick={() => setMes(somarMeses(mes, 1))}>
              ›
            </button>
          </div>
          <button type="button" className="btn btn--fantasma btn--pequeno" onClick={() => supabase.auth.signOut()}>
            Sair
          </button>
        </div>
      </header>

      <nav className="abas" aria-label="Seções">
        {ABAS.map(({ id, rotulo, curto, Icone }) => (
          <button
            key={id}
            type="button"
            className="abas__item"
            aria-current={aba === id ? 'page' : undefined}
            onClick={() => irPara(id)}
          >
            <Icone />
            <span className="abas__longo">{rotulo}</span>
            <span className="abas__curto">{curto}</span>
          </button>
        ))}
      </nav>

      <main className="conteudo">
        <Tela mes={mes} setMes={setMes} />
      </main>
    </div>
  )
}
