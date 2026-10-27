import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import {
  basisPoints,
  centavos,
  mutableColumns,
  baseColumns,
  revisionColumn,
} from '../../platform/db/columns'

export const servicos = pgTable(
  'servicos',
  {
    ...mutableColumns(),
    nome: text('nome').notNull(),
    descricao: text('descricao'),
    precoCentavos: centavos('preco_centavos').notNull(),
    duracaoMinutos: integer('duracao_minutos').notNull(),
    tipo: text('tipo').notNull(),
    ativo: boolean('ativo').notNull().default(true),
    fotoKey: text('foto_key'),
    componentesAssinatura: text('componentes_assinatura'),
  },
  (t) => [
    unique('servicos_barbearia_id_id_uidx').on(t.barbeariaId, t.id),
    uniqueIndex('servicos_combo_ativo_componentes_uidx')
      .on(t.barbeariaId, t.componentesAssinatura)
      .where(sql`${t.tipo} = 'combo' and ${t.ativo}`),
    index('servicos_barbearia_ativo_nome_idx').on(t.barbeariaId, t.ativo, t.nome),
    check('servicos_preco_positivo', sql`${t.precoCentavos} > 0`),
    check('servicos_duracao_positiva', sql`${t.duracaoMinutos} > 0`),
    check('servicos_tipo_valido', sql`${t.tipo} in ('simples', 'combo')`),
    check(
      'servicos_assinatura_combo',
      sql`(${t.tipo} = 'simples' and ${t.componentesAssinatura} is null)
        or (${t.tipo} = 'combo' and ${t.componentesAssinatura} is not null)`,
    ),
  ],
)

export const comboComponentes = pgTable(
  'combo_componentes',
  {
    ...baseColumns(),
    comboId: uuid('combo_id').notNull(),
    componenteId: uuid('componente_id').notNull(),
  },
  (t) => [
    unique('combo_componentes_par_uidx').on(t.barbeariaId, t.comboId, t.componenteId),
    foreignKey({
      name: 'combo_componentes_combo_fk',
      columns: [t.barbeariaId, t.comboId],
      foreignColumns: [servicos.barbeariaId, servicos.id],
    }),
    foreignKey({
      name: 'combo_componentes_componente_fk',
      columns: [t.barbeariaId, t.componenteId],
      foreignColumns: [servicos.barbeariaId, servicos.id],
    }),
    check('combo_componentes_sem_autorreferencia', sql`${t.comboId} <> ${t.componenteId}`),
    index('combo_componentes_combo_idx').on(t.barbeariaId, t.comboId),
  ],
)

export const barbeiros = pgTable(
  'barbeiros',
  {
    ...mutableColumns(),
    // TODO T04: usuario_id será ligado por FK composta quando a tabela de identidade existir.
    usuarioId: uuid('usuario_id').notNull(),
    nomeExibicao: text('nome_exibicao').notNull(),
    fotoKey: text('foto_key'),
    bio: text('bio'),
    ativo: boolean('ativo').notNull().default(true),
    ordem: integer('ordem').notNull().default(0),
  },
  (t) => [
    unique('barbeiros_barbearia_id_id_uidx').on(t.barbeariaId, t.id),
    uniqueIndex('barbeiros_usuario_uidx').on(t.barbeariaId, t.usuarioId),
    index('barbeiros_publicos_idx').on(t.barbeariaId, t.ativo, t.ordem, t.nomeExibicao),
    check('barbeiros_ordem_nao_negativa', sql`${t.ordem} >= 0`),
  ],
)

export const habilitacoes = pgTable(
  'habilitacoes',
  {
    ...baseColumns(),
    barbeiroId: uuid('barbeiro_id').notNull(),
    servicoId: uuid('servico_id').notNull(),
    habilitado: boolean('habilitado').notNull().default(false),
    // Revisão monotônica do par barbeiro × serviço: vira `aggregateRevision` de EnablementChanged.
    revisao: revisionColumn(),
  },
  (t) => [
    unique('habilitacoes_barbearia_par_uidx').on(t.barbeariaId, t.barbeiroId, t.servicoId),
    foreignKey({
      name: 'habilitacoes_barbeiro_fk',
      columns: [t.barbeariaId, t.barbeiroId],
      foreignColumns: [barbeiros.barbeariaId, barbeiros.id],
    }),
    foreignKey({
      name: 'habilitacoes_servico_fk',
      columns: [t.barbeariaId, t.servicoId],
      foreignColumns: [servicos.barbeariaId, servicos.id],
    }),
    index('habilitacoes_servico_idx').on(t.barbeariaId, t.servicoId, t.habilitado),
  ],
)

export const comissaoVigencias = pgTable(
  'comissao_vigencias',
  {
    ...baseColumns(),
    barbeiroId: uuid('barbeiro_id').notNull(),
    servicoId: uuid('servico_id').notNull(),
    percentualAvulsoBp: basisPoints('pct_avulso_bp').notNull(),
    percentualAssinanteBp: basisPoints('pct_assinante_bp').notNull(),
    inicio: date('inicio', { mode: 'string' }).notNull(),
    fim: date('fim', { mode: 'string' }),
  },
  (t) => [
    unique('comissao_vigencias_inicio_uidx').on(t.barbeariaId, t.barbeiroId, t.servicoId, t.inicio),
    foreignKey({
      name: 'comissao_vigencias_barbeiro_fk',
      columns: [t.barbeariaId, t.barbeiroId],
      foreignColumns: [barbeiros.barbeariaId, barbeiros.id],
    }),
    foreignKey({
      name: 'comissao_vigencias_servico_fk',
      columns: [t.barbeariaId, t.servicoId],
      foreignColumns: [servicos.barbeariaId, servicos.id],
    }),
    check(
      'comissao_vigencias_bp_validos',
      sql`${t.percentualAvulsoBp} between 0 and 10000
        and ${t.percentualAssinanteBp} between 0 and 10000`,
    ),
    check('comissao_vigencias_fim_valido', sql`${t.fim} is null or ${t.fim} >= ${t.inicio}`),
    index('comissao_vigencias_par_inicio_idx').on(
      t.barbeariaId,
      t.barbeiroId,
      t.servicoId,
      t.inicio,
    ),
  ],
)
