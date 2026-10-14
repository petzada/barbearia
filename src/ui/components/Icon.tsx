import type { ReactNode, SVGProps } from 'react'

// Conjunto mínimo de ícones de traço (24x24). Sempre decorativos: o significado vem do texto ao lado
// ou do `label` (PRD §4.1: erro e estado não dependem só de cor ou de ícone).
const GLIFOS = {
  inicio: <path d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10M10 20v-5.5h4V20" />,
  agendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4M12 13v4M10 15h4" />
    </>
  ),
  plano: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <path d="M3 10.5h18M7 15h4" />
    </>
  ),
  perfil: (
    <>
      <circle cx="12" cy="8.5" r="3.7" />
      <path d="M4.5 20c.6-3.7 3.5-6 7.5-6s6.9 2.3 7.5 6" />
    </>
  ),
  agenda: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4M7.5 14h2M11 14h2M14.5 14h2M7.5 17h2M11 17h2" />
    </>
  ),
  atendimentos: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2.5" />
      <path d="M9 4h6v3H9zM8.5 13.5l2.3 2.3 4.7-4.8" />
    </>
  ),
  ganhos: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" />
      <rect x="3.5" y="8" width="17" height="11.5" rx="2.5" />
      <circle cx="16.5" cy="13.7" r="1.2" />
    </>
  ),
  gestao: <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />,
  sino: <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15zM10 20.5a2.2 2.2 0 0 0 4 0" />,
  planos: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />,
  servicos: (
    <>
      <circle cx="6.5" cy="6.5" r="2.7" />
      <circle cx="6.5" cy="17.5" r="2.7" />
      <path d="M8.5 8.5 20 19M8.5 15.5 20 5" />
    </>
  ),
  barbeiros: (
    <>
      <circle cx="9" cy="8.5" r="3.4" />
      <path d="M2.8 20c.5-3.4 3-5.5 6.2-5.5s5.7 2.1 6.2 5.5M16 5.5a3.3 3.3 0 0 1 0 6M18 14.8c1.9.7 3 2.4 3.3 5.2" />
    </>
  ),
  entrar: (
    <path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14M10 8l-4 4 4 4M6 12h10" />
  ),
  painel: (
    <>
      <rect x="3.5" y="3.5" width="7" height="9" rx="1.8" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.8" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.8" />
      <rect x="3.5" y="15.5" width="7" height="5" rx="1.8" />
    </>
  ),
  jornadas: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.2 2" />
    </>
  ),
  financeiro: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6.5 9.5v.01M17.5 14.5v.01" />
    </>
  ),
  comissoes: (
    <path d="M19 5 5 19M7.5 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16.5 18.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
  ),
  correcoes: <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17zM14 8l3 3" />,
  configuracoes: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
    </>
  ),
  suporte: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M6 6l3.8 3.8M18 6l-3.8 3.8M6 18l3.8-3.8M18 18l-3.8-3.8" />
    </>
  ),
  privacidade: (
    <path d="M12 3.5 5 6v5.5c0 4.4 2.9 7.6 7 9 4.1-1.4 7-4.6 7-9V6zM9 12l2.2 2.2L15.2 10" />
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  alerta: <path d="M12 4 3 19.5h18zM12 10v4.5M12 17.2v.01" />,
  erro: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8v.01" />
    </>
  ),
  fechar: <path d="M6 6l12 12M18 6 6 18" />,
  setaDireita: <path d="M9 5l7 7-7 7" />,
  setaEsquerda: <path d="M15 5l-7 7 7 7" />,
  computador: (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="2" />
      <path d="M8.5 20h7M12 16.5V20" />
    </>
  ),
  vazio: (
    <>
      <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z" />
      <path d="M4 8.5 12 13l8-4.5M12 13v7" />
    </>
  ),
  relogio: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  girar: <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" />,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof GLIFOS

export const ICON_NAMES = Object.keys(GLIFOS) as IconName[]

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  /** Tamanho em px (padrão 24). */
  size?: number
  /** Só quando o ícone é a única informação do controle; senão fica oculto para leitor de tela. */
  label?: string
}

export function Icon({ name, size = 24, label, className, ...resto }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      className={className}
      {...resto}
    >
      {GLIFOS[name]}
    </svg>
  )
}
