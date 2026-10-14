import type { Role } from '~/contracts'
import type { IconName } from '../components/Icon'

export interface NavItem {
  readonly id: string
  readonly label: string
  readonly to: string
  readonly icon: IconName
  /** Ativo só na rota exata (o item "Início"/"Agenda"/"Painel" é prefixo de todos os outros). */
  readonly exact?: boolean
}

/** Visitante (PRD §4.2): Boas-vindas aparecem à parte (uma vez); a barra leva às telas públicas. */
export const TABS_PUBLICO: readonly NavItem[] = [
  { id: 'planos', label: 'Planos', to: '/planos', icon: 'planos' },
  { id: 'servicos', label: 'Serviços', to: '/servicos', icon: 'servicos' },
  { id: 'barbeiros', label: 'Barbeiros', to: '/barbeiros', icon: 'barbeiros' },
  { id: 'entrar', label: 'Entrar', to: '/entrar', icon: 'entrar' },
]

/** Cliente (D0047): Início · Agendar · Plano · Perfil. */
export const TABS_CLIENTE: readonly NavItem[] = [
  { id: 'inicio', label: 'Início', to: '/app', icon: 'inicio', exact: true },
  { id: 'agendar', label: 'Agendar', to: '/app/agendar', icon: 'agendar' },
  { id: 'plano', label: 'Plano', to: '/app/plano', icon: 'plano' },
  { id: 'perfil', label: 'Perfil', to: '/app/perfil', icon: 'perfil' },
]

const ABA_AGENDA: NavItem = {
  id: 'agenda',
  label: 'Agenda',
  to: '/equipe',
  icon: 'agenda',
  exact: true,
}
const ABA_ATENDIMENTOS: NavItem = {
  id: 'atendimentos',
  label: 'Atendimentos',
  to: '/equipe/atendimentos',
  icon: 'atendimentos',
}
const ABA_GANHOS: NavItem = { id: 'ganhos', label: 'Ganhos', to: '/equipe/ganhos', icon: 'ganhos' }
const ABA_GESTAO: NavItem = { id: 'gestao', label: 'Gestão', to: '/equipe/gestao', icon: 'gestao' }
const ABA_PERFIL_EQUIPE: NavItem = {
  id: 'perfil',
  label: 'Perfil',
  to: '/equipe/perfil',
  icon: 'perfil',
}

export const ROLES_DE_EQUIPE: readonly Role[] = ['barbeiro', 'admin']

export function isStaff(roles: readonly Role[]): boolean {
  return roles.some((r) => ROLES_DE_EQUIPE.includes(r))
}

/**
 * Abas da equipe por papel (PRD §4.2):
 * - barbeiro: Agenda · Atendimentos · Ganhos · Perfil;
 * - admin que também é barbeiro: as de barbeiro + Gestão (antes do Perfil, que fica sempre por último);
 * - admin que não é barbeiro: Agenda (todas) · Atendimentos · Gestão · Perfil.
 * Esconder aba é só conforto: o servidor autoriza cada operação (D0071).
 */
export function staffTabs(roles: readonly Role[]): readonly NavItem[] {
  const admin = roles.includes('admin')
  const barbeiro = roles.includes('barbeiro')
  if (!admin && !barbeiro) return []
  if (admin && barbeiro) {
    return [ABA_AGENDA, ABA_ATENDIMENTOS, ABA_GANHOS, ABA_GESTAO, ABA_PERFIL_EQUIPE]
  }
  if (admin) return [ABA_AGENDA, ABA_ATENDIMENTOS, ABA_GESTAO, ABA_PERFIL_EQUIPE]
  return [ABA_AGENDA, ABA_ATENDIMENTOS, ABA_GANHOS, ABA_PERFIL_EQUIPE]
}

/** Menu lateral do backoffice desktop (`/admin`). */
export const MENU_ADMIN: readonly NavItem[] = [
  { id: 'painel', label: 'Painel', to: '/admin', icon: 'painel', exact: true },
  { id: 'clientes', label: 'Clientes', to: '/admin/clientes', icon: 'barbeiros' },
  { id: 'agenda', label: 'Agenda', to: '/admin/agenda', icon: 'agenda' },
  { id: 'equipe', label: 'Equipe', to: '/admin/equipe', icon: 'perfil' },
  { id: 'servicos', label: 'Serviços', to: '/admin/servicos', icon: 'servicos' },
  { id: 'planos', label: 'Planos', to: '/admin/planos', icon: 'planos' },
  { id: 'jornadas', label: 'Jornadas', to: '/admin/jornadas', icon: 'jornadas' },
  { id: 'financeiro', label: 'Financeiro', to: '/admin/financeiro', icon: 'financeiro' },
  { id: 'comissoes', label: 'Comissões', to: '/admin/comissoes', icon: 'comissoes' },
  { id: 'correcoes', label: 'Correções', to: '/admin/correcoes', icon: 'correcoes' },
  {
    id: 'configuracoes',
    label: 'Configurações',
    to: '/admin/configuracoes',
    icon: 'configuracoes',
  },
  { id: 'suporte', label: 'Suporte', to: '/admin/suporte', icon: 'suporte' },
  { id: 'privacidade', label: 'Privacidade', to: '/admin/privacidade', icon: 'privacidade' },
]
