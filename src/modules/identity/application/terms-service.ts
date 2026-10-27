import { createHash } from 'node:crypto'
import { and, eq, inArray } from 'drizzle-orm'
import type { Clock } from '~/contracts/clock'
import type { Executor } from '~/platform/db/types'
import { newId } from '~/platform/ids'
import { IdentityErrors } from '../errors'
import {
  aceitesDocumentos,
  DOCUMENTO_TIPOS,
  documentosLegais,
  type AceiteCanal,
  type DocumentoLegal,
  type DocumentoTipo,
} from '../schema'

export interface DocumentoVigente {
  readonly tipo: DocumentoTipo
  readonly versao: string
  readonly hash: string
  readonly texto: string
}

export function hashDocumento(texto: string): string {
  return createHash('sha256').update(texto, 'utf8').digest('hex')
}

/** RN13: um documento vigente por tipo. Falta qualquer um → o aceite não pode acontecer (falha fechada). */
export async function documentosVigentes(
  db: Executor,
  barbeariaId: string,
): Promise<DocumentoLegal[]> {
  const linhas = await db
    .select()
    .from(documentosLegais)
    .where(and(eq(documentosLegais.barbeariaId, barbeariaId), eq(documentosLegais.vigente, true)))
  const faltando = DOCUMENTO_TIPOS.filter((tipo) => !linhas.some((l) => l.tipo === tipo))
  if (faltando.length > 0) throw IdentityErrors.TERMS_UNAVAILABLE()
  return linhas
}

export function paraCliente(documento: DocumentoLegal): DocumentoVigente {
  return {
    tipo: documento.tipo as DocumentoTipo,
    versao: documento.versao,
    hash: documento.hash,
    texto: documento.texto,
  }
}

/** Publica uma versão e a torna a vigente do tipo (a anterior deixa de ser vigente, mas o aceite antigo permanece). */
export async function publicarDocumento(
  tx: Executor,
  clock: Clock,
  input: { barbeariaId: string; tipo: DocumentoTipo; versao: string; texto: string },
): Promise<DocumentoLegal> {
  await tx
    .update(documentosLegais)
    .set({ vigente: false })
    .where(
      and(
        eq(documentosLegais.barbeariaId, input.barbeariaId),
        eq(documentosLegais.tipo, input.tipo),
        eq(documentosLegais.vigente, true),
      ),
    )
  const [linha] = await tx
    .insert(documentosLegais)
    .values({
      id: newId(clock),
      barbeariaId: input.barbeariaId,
      tipo: input.tipo,
      versao: input.versao,
      hash: hashDocumento(input.texto),
      texto: input.texto,
      vigente: true,
      criadoEm: clock.now(),
    })
    .returning()
  if (!linha) throw new Error('Não foi possível publicar o documento legal.')
  return linha
}

export interface AceiteInput {
  /** Versões que a pessoa viu e aceitou, por tipo. */
  readonly termos: string
  readonly privacidade: string
}

/** Confere que as versões aceitas são as vigentes agora (RN13/RN14: proposta diferente → novo aceite). */
export function conferirVersoes(vigentes: readonly DocumentoLegal[], aceite: AceiteInput): void {
  for (const doc of vigentes) {
    const aceita = doc.tipo === 'termos' ? aceite.termos : aceite.privacidade
    if (aceita !== doc.versao) throw IdentityErrors.TERMS_OUTDATED()
  }
}

/** Registra versão, hash, instante e canal (D0046). Idempotente por (usuário, documento). */
export async function registrarAceites(
  tx: Executor,
  input: {
    clock: Clock
    barbeariaId: string
    usuarioId: string
    documentos: readonly DocumentoLegal[]
    canal: AceiteCanal
    registradoPor?: string
  },
): Promise<void> {
  const agora = input.clock.now()
  await tx
    .insert(aceitesDocumentos)
    .values(
      input.documentos.map((doc) => ({
        id: newId(input.clock),
        barbeariaId: input.barbeariaId,
        usuarioId: input.usuarioId,
        documentoId: doc.id,
        versao: doc.versao,
        hash: doc.hash,
        aceitoEm: agora,
        canal: input.canal,
        registradoPor: input.registradoPor ?? input.usuarioId,
        criadoEm: agora,
      })),
    )
    .onConflictDoNothing()
}

/** Documentos vigentes que a pessoa ainda não aceitou (versão nova ⇒ aceitar de novo). */
export async function documentosPendentes(
  db: Executor,
  barbeariaId: string,
  usuarioId: string,
): Promise<DocumentoLegal[]> {
  const vigentes = await documentosVigentes(db, barbeariaId)
  const aceitos = await db
    .select({ documentoId: aceitesDocumentos.documentoId })
    .from(aceitesDocumentos)
    .where(
      and(
        eq(aceitesDocumentos.usuarioId, usuarioId),
        inArray(
          aceitesDocumentos.documentoId,
          vigentes.map((d) => d.id),
        ),
      ),
    )
  const ids = new Set(aceitos.map((a) => a.documentoId))
  return vigentes.filter((d) => !ids.has(d.id))
}
