// API pública do módulo de identidade (PRD §7.2). Outros módulos importam só daqui.
export { IdentityErrors } from './errors'
export { PhoneChanged, TeamRoleGranted, TeamRoleRevoked, UserActivated } from './events'
export {
  createPreRegistered,
  findByPhone,
  getUser,
  listTeam,
} from './application/users-service'
export type { PreRegisterInput, UsuarioResumo } from './application/users-service'
export { publicarDocumento } from './application/terms-service'
export { createIdentityDeps } from './infra/deps'
export type { IdentityDeps } from './infra/deps'
export { setIdentityOutbox, setNotificationProvider } from './infra/ports'
export { PAPEIS_EQUIPE, USUARIO_ESTADOS } from './schema'
export type { PapelEquipe, UsuarioEstado } from './schema'
