import type { Role } from '~/contracts/context'
import type { PapelEquipe, UsuarioEstado } from '../schema'

// D0002/D0071: papéis combináveis. `cliente` é implícito em conta viva; equipe vem dos papéis ativos.

export function contaViva(estado: UsuarioEstado | string): boolean {
  return estado === 'ativo' || estado === 'exclusao_agendada'
}

/** Papéis efetivos da pessoa. Conta que não está viva (pré-cadastro, anonimizada) não tem nenhum. */
export function papeisEfetivos(estado: string, papeisAtivos: readonly PapelEquipe[]): Role[] {
  if (!contaViva(estado)) return []
  return ['cliente', ...new Set(papeisAtivos)]
}

/** Só quem tem conta ativa recebe papel de equipe (pré-cadastro não tem WhatsApp verificado). */
export function podeReceberPapel(estado: string): boolean {
  return estado === 'ativo'
}

/** D0071: o sistema nunca fica sem administrador. */
export function podeRemoverAdmin(outrosAdminsAtivos: number): boolean {
  return outrosAdminsAtivos >= 1
}
