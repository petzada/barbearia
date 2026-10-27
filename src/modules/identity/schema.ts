import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { baseColumns, instant, mutableColumns } from '../../platform/db/columns'

// D0070: a conta tem identificador interno permanente (UUID v7); o telefone é um vínculo verificado, não a identidade.

export const USUARIO_ESTADOS = [
  'pre_cadastrado',
  'ativo',
  'exclusao_agendada',
  'anonimizado',
] as const
export type UsuarioEstado = (typeof USUARIO_ESTADOS)[number]

/** Papéis de equipe guardados. `cliente` é implícito em toda conta `ativo`/`exclusao_agendada` (D0002, D0071). */
export const PAPEIS_EQUIPE = ['barbeiro', 'admin'] as const
export type PapelEquipe = (typeof PAPEIS_EQUIPE)[number]

export const usuarios = pgTable(
  'usuarios',
  {
    ...mutableColumns(),
    nome: text('nome').notNull(),
    estado: text('estado').notNull().default('ativo'),
    /** Perfil do Google, só exibição. NUNCA usado para vincular contas (RN01). */
    email: text('email'),
    /**
     * Valor que o Better Auth enxerga como e-mail: derivado do id, nunca igual ao e-mail de ninguém. Garante que
     * nenhuma identidade do Google case com a conta por e-mail (RN01) e evita e-mail nulo, que o Better Auth não aceita.
     */
    emailInterno: text('email_interno').generatedAlwaysAs(sql`(id::text || '@usuarios.invalid')`),
    emailVerificado: boolean('email_verificado').notNull().default(false),
    imagem: text('imagem'),
    /**
     * D0046/D0073: lembretes opcionais ligados por padrão; SAIR e o Perfil desligam. Vive na conta, então a
     * preferência atravessa a ativação do pré-cadastro. T31 é a dona do uso; T04 só garante a preservação.
     */
    lembretesAtivos: boolean('lembretes_ativos').notNull().default(true),
    /** D0034: quem cadastrou (pré-cadastro pela equipe). */
    registradoPor: uuid('registrado_por'),
    ativadoEm: instant('ativado_em'),
  },
  (t) => [
    unique('usuarios_barbearia_id_id').on(t.barbeariaId, t.id),
    index('usuarios_estado_idx').on(t.barbeariaId, t.estado),
    check(
      'usuarios_estado_valido',
      sql`${t.estado} in ('pre_cadastrado', 'ativo', 'exclusao_agendada', 'anonimizado')`,
    ),
  ],
)
export type Usuario = typeof usuarios.$inferSelect

export const papeisUsuario = pgTable(
  'papeis_usuario',
  {
    ...mutableColumns(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    papel: text('papel').notNull(),
    ativo: boolean('ativo').notNull().default(true),
    concedidoPor: uuid('concedido_por'),
    revogadoEm: instant('revogado_em'),
    revogadoPor: uuid('revogado_por'),
    motivoRevogacao: text('motivo_revogacao'),
  },
  (t) => [
    // Um papel ativo por pessoa; o histórico (revogados) fica como linhas inativas.
    uniqueIndex('papeis_usuario_ativo_uidx')
      .on(t.barbeariaId, t.usuarioId, t.papel)
      .where(sql`${t.ativo}`),
    index('papeis_usuario_papel_idx').on(t.barbeariaId, t.papel, t.ativo),
    check('papeis_usuario_papel_valido', sql`${t.papel} in ('barbeiro', 'admin')`),
  ],
)
export type PapelUsuario = typeof papeisUsuario.$inferSelect

export const vinculosTelefone = pgTable(
  'vinculos_telefone',
  {
    ...baseColumns(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    /** E.164 brasileiro (`+55DDNNNNNNNNN`), sempre normalizado antes de gravar e comparar. */
    telefone: text('telefone').notNull(),
    /** `null` = pré-cadastro (D0034): o número ainda não foi provado. */
    verificadoEm: instant('verificado_em'),
    ativo: boolean('ativo').notNull().default(true),
    desativadoEm: instant('desativado_em'),
    motivoDesativacao: text('motivo_desativacao'),
  },
  (t) => [
    // RN01: único entre vínculos ATIVOS da instalação. Vínculos antigos ficam como histórico.
    uniqueIndex('vinculos_telefone_ativo_uidx')
      .on(t.barbeariaId, t.telefone)
      .where(sql`${t.ativo}`),
    index('vinculos_telefone_usuario_idx').on(t.barbeariaId, t.usuarioId, t.ativo),
    check('vinculos_telefone_e164', sql`${t.telefone} ~ '^\\+55[1-9][1-9]9[0-9]{8}$'`),
  ],
)
export type VinculoTelefone = typeof vinculosTelefone.$inferSelect

export const DOCUMENTO_TIPOS = ['termos', 'privacidade'] as const
export type DocumentoTipo = (typeof DOCUMENTO_TIPOS)[number]

// RN13: textos por barbearia, versionados; o aceite registra versão e hash. O conteúdo aprovado é do H03.
export const documentosLegais = pgTable(
  'documentos_legais',
  {
    ...baseColumns(),
    tipo: text('tipo').notNull(),
    versao: text('versao').notNull(),
    /** SHA-256 do texto: prova qual redação foi aceita. */
    hash: text('hash').notNull(),
    texto: text('texto').notNull(),
    vigente: boolean('vigente').notNull().default(false),
  },
  (t) => [
    unique('documentos_legais_versao_uq').on(t.barbeariaId, t.tipo, t.versao),
    uniqueIndex('documentos_legais_vigente_uidx')
      .on(t.barbeariaId, t.tipo)
      .where(sql`${t.vigente}`),
    check('documentos_legais_tipo_valido', sql`${t.tipo} in ('termos', 'privacidade')`),
    check('documentos_legais_hash_sha256', sql`${t.hash} ~ '^[0-9a-f]{64}$'`),
  ],
)
export type DocumentoLegal = typeof documentosLegais.$inferSelect

export const ACEITE_CANAIS = ['app', 'balcao', 'telefone'] as const
export type AceiteCanal = (typeof ACEITE_CANAIS)[number]

export const aceitesDocumentos = pgTable(
  'aceites_documentos',
  {
    ...baseColumns(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    documentoId: uuid('documento_id')
      .notNull()
      .references(() => documentosLegais.id),
    versao: text('versao').notNull(),
    hash: text('hash').notNull(),
    aceitoEm: instant('aceito_em').notNull(),
    canal: text('canal').notNull(),
    /** Quem registrou: o próprio usuário (app) ou um membro da equipe (balcão/telefone, RN14). */
    registradoPor: uuid('registrado_por'),
  },
  (t) => [
    unique('aceites_documentos_uq').on(t.usuarioId, t.documentoId),
    index('aceites_documentos_usuario_idx').on(t.barbeariaId, t.usuarioId),
    check('aceites_documentos_canal_valido', sql`${t.canal} in ('app', 'balcao', 'telefone')`),
  ],
)

export const OTP_FINALIDADES = ['login', 'troca_telefone', 'reautenticacao'] as const
export type OtpFinalidade = (typeof OTP_FINALIDADES)[number]

// RN01: OTP guardado só como hash, uso único, 5 tentativas por código. Reenvio invalida o anterior mas cada
// linha continua contando nos limites de envio por telefone e por IP (contadores de abuso não zeram).
export const otpDesafios = pgTable(
  'otp_desafios',
  {
    ...baseColumns(),
    telefone: text('telefone').notNull(),
    finalidade: text('finalidade').notNull(),
    /** Só em troca de telefone e reautenticação (sessão ativa). */
    usuarioId: uuid('usuario_id').references(() => usuarios.id),
    codigoHash: text('codigo_hash').notNull(),
    /** HMAC do IP: o IP bruto nunca é gravado. */
    ipHash: text('ip_hash').notNull(),
    expiraEm: instant('expira_em').notNull(),
    tentativas: integer('tentativas').notNull().default(0),
    maxTentativas: integer('max_tentativas').notNull().default(5),
    invalidadoEm: instant('invalidado_em'),
    verificadoEm: instant('verificado_em'),
    /** Continuação do primeiro acesso (nome + aceite): hash de um token de uso único, 10 min. */
    continuacaoHash: text('continuacao_hash'),
    continuacaoExpiraEm: instant('continuacao_expira_em'),
    continuacaoUsadaEm: instant('continuacao_usada_em'),
  },
  (t) => [
    index('otp_desafios_telefone_idx').on(t.barbeariaId, t.telefone, t.criadoEm),
    index('otp_desafios_ip_idx').on(t.barbeariaId, t.ipHash, t.criadoEm),
    uniqueIndex('otp_desafios_continuacao_uidx')
      .on(t.continuacaoHash)
      .where(sql`${t.continuacaoHash} is not null`),
    check(
      'otp_desafios_finalidade_valida',
      sql`${t.finalidade} in ('login', 'troca_telefone', 'reautenticacao')`,
    ),
  ],
)
export type OtpDesafio = typeof otpDesafios.$inferSelect

// ---- Tabelas do Better Auth (sessão, contas sociais, estado do OAuth) -------------------------------------
// Nomes de propriedade em inglês porque o Better Auth as lê por nome; o usuário dele é `usuarios` (mapeado).
// Os ids são UUID v7 gerados por nós (`advanced.database.generateId`).

export const authSessions = pgTable(
  'auth_sessoes',
  {
    id: uuid('id').primaryKey(),
    expiresAt: timestamp('expira_em', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('criado_em', { withTimezone: true }).notNull(),
    updatedAt: timestamp('atualizado_em', { withTimezone: true }).notNull(),
    ipAddress: text('ip'),
    userAgent: text('user_agent'),
    userId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    /** D0071: instante da última autenticação; o Better Auth não tem este conceito. */
    authTime: timestamp('auth_time', { withTimezone: true }).notNull(),
  },
  (t) => [index('auth_sessoes_usuario_idx').on(t.userId)],
)

export const authAccounts = pgTable(
  'auth_contas',
  {
    id: uuid('id').primaryKey(),
    accountId: text('conta_externa_id').notNull(),
    providerId: text('provedor').notNull(),
    userId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expira_em', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expira_em', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('criado_em', { withTimezone: true }).notNull(),
    updatedAt: timestamp('atualizado_em', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('auth_contas_provedor_uidx').on(t.providerId, t.accountId),
    index('auth_contas_usuario_idx').on(t.userId),
  ],
)

export const authVerifications = pgTable('auth_verificacoes', {
  id: uuid('id').primaryKey(),
  identifier: text('identificador').notNull(),
  value: text('valor').notNull(),
  expiresAt: timestamp('expira_em', { withTimezone: true }).notNull(),
  createdAt: timestamp('criado_em', { withTimezone: true }).notNull(),
  updatedAt: timestamp('atualizado_em', { withTimezone: true }).notNull(),
})

