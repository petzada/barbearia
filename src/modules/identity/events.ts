import { defineEvent } from '~/platform/context'

// PRD §7.3: eventos do módulo de identidade. Os consumidores (T30 desativa push; T31 liga mensagens) assinam por tipo.
export const UserActivated = defineEvent<
  'UserActivated',
  { usuarioId: string; origem: 'primeiro_acesso' | 'pre_cadastro' }
>('UserActivated', 1)

export const TeamRoleGranted = defineEvent<
  'TeamRoleGranted',
  { usuarioId: string; papel: string; concedidoPor: string }
>('TeamRoleGranted', 1)

/** T30 desativa as assinaturas de push na hora (D0071). `papeisRestantes` mostra se a pessoa ainda é equipe. */
export const TeamRoleRevoked = defineEvent<
  'TeamRoleRevoked',
  { usuarioId: string; papel: string; revogadoPor: string; papeisRestantes: string[] }
>('TeamRoleRevoked', 1)

/** Telefones mascarados: o payload do outbox não carrega número completo. */
export const PhoneChanged = defineEvent<
  'PhoneChanged',
  { usuarioId: string; telefoneAnterior: string; telefoneNovo: string }
>('PhoneChanged', 1)
