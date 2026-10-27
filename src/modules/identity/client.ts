// Pode ser importado pelo navegador: só tipos do servidor + `remoteOperation` (nada de servidor no bundle).
import { remoteOperation } from '~/platform/context/client'
import type {
  aceitarDocumentos,
  buscarPorTelefone,
  concederPapel,
  listarEquipe,
  me,
  revogarPapel,
} from './server'

export const meRemoto = remoteOperation<typeof me>('identity.me')
export const listarEquipeRemoto = remoteOperation<typeof listarEquipe>('identity.listarEquipe')
export const buscarPorTelefoneRemoto =
  remoteOperation<typeof buscarPorTelefone>('identity.buscarPorTelefone')
export const aceitarDocumentosRemoto =
  remoteOperation<typeof aceitarDocumentos>('identity.aceitarDocumentos')
export const concederPapelRemoto = remoteOperation<typeof concederPapel>('identity.concederPapel')
export const revogarPapelRemoto = remoteOperation<typeof revogarPapel>('identity.revogarPapel')
