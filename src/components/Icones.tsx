// Ícones simples de traço, herdam a cor do texto.
const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const IconePainel = () => (
  <svg {...base}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
)
export const IconeAtendimentos = () => (
  <svg {...base}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4M8 15h4" />
  </svg>
)
export const IconeServicos = () => (
  <svg {...base}>
    <path d="M3 13c3-4 6-6 9-6s6 2 9 6" />
    <path d="M6 10.5 5 8M9.5 8.3 9 5.5M14.5 8.3 15 5.5M18 10.5 19 8" />
  </svg>
)
export const IconeCustos = () => (
  <svg {...base}>
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M3 10h18M7 15h3" />
  </svg>
)
export const IconeReserva = () => (
  <svg {...base}>
    <path d="M5 11a7 6 0 0 1 13-2.5h1.5a1.5 1.5 0 0 1 0 3H19a7 6 0 0 1-3 4.2V19h-3v-2h-2v2H8v-3.4A6 6 0 0 1 5 11Z" />
    <path d="M10 8h3" />
  </svg>
)
export const IconeCatalogo = () => (
  <svg {...base}>
    <path d="M6 3h9l3 3v15H6z" />
    <path d="M9 10h6M9 14h6M9 18h3" />
  </svg>
)
