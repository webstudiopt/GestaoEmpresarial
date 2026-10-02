import { useState } from 'react'

// Arquivos do manual da marca (coloque em public/marca/ com estes nomes):
//   logo.png          → versão para fundo claro (login no tema claro)
//   logo-negativo.png → versão clara, para fundo verde ou escuro (cabeçalho e login no escuro)
const ARQUIVO = {
  positivo: 'marca/logo.png',
  negativo: 'marca/logo-negativo.png',
} as const

/** Logo da marca. Enquanto o arquivo não existir, mostra o nome em texto. */
export function Logo({ variante, grande = false }: { variante: keyof typeof ARQUIVO; grande?: boolean }) {
  const [semArquivo, setSemArquivo] = useState(false)

  if (semArquivo)
    return (
      <span className={`logo-texto ${grande ? 'logo-texto--grande' : ''}`}>
        <small>Studio · Santa Bárbara MG</small>
        <b>Andrade Concept</b>
      </span>
    )

  return (
    <img
      className={`logo ${grande ? 'logo--grande' : ''}`}
      src={import.meta.env.BASE_URL + ARQUIVO[variante]}
      alt="Andrade Concept"
      onError={() => setSemArquivo(true)}
    />
  )
}
