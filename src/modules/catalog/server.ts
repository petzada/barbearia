import { z } from 'zod'
import { ok } from '~/contracts'
import { policies } from '~/platform/authz'
import { defineCommand, defineQuery } from '~/platform/context'
import { uuidSchema, centavosSchema, dataLocalSchema } from '~/platform/validation'
import { CatalogErrors } from './errors'
import { catalogDependencies } from './deps'
import {
  changeEnablement,
  createCombo,
  createService,
  deactivateService,
  scheduleCommission,
  updateService,
} from './application/catalogo'
import {
  getShopTimeZone,
  listAdminCatalog,
  listMatrix,
  listPublicBarbers,
  listPublicCatalog,
} from './infra/repository'
import { localDate, parseTimeZone } from '~/platform/time'
import './dev-session.server'

const semEntrada = z.object({})
const identificador = z.object({ servicoId: uuidSchema })
const dadosServico = z.object({
  nome: z.string().trim().min(2).max(100),
  descricao: z.string().trim().max(1000).optional(),
  precoCentavos: centavosSchema.min(1),
  duracaoMinutos: z.number().int().min(1),
})

export const listPublicCatalogOperation = defineQuery({
  name: 'catalog.listPublicCatalog',
  input: semEntrada,
  policy: policies.public(),
  handler: async ({ ctx, db }) =>
    ok({ servicos: await listPublicCatalog(db, ctx.barbeariaId, catalogDependencies.storage) }),
})

export const listPublicBarbersOperation = defineQuery({
  name: 'catalog.listPublicBarbers',
  input: semEntrada,
  policy: policies.public(),
  handler: async ({ ctx, db }) =>
    ok({ barbeiros: await listPublicBarbers(db, ctx.barbeariaId, catalogDependencies.storage) }),
})

export const listAdminCatalogOperation = defineQuery({
  name: 'catalog.listAdminCatalog',
  input: semEntrada,
  policy: policies.anyRole('admin'),
  handler: async ({ ctx, db }) => ok({ servicos: await listAdminCatalog(db, ctx.barbeariaId) }),
})

export const listMatrixOperation = defineQuery({
  name: 'catalog.listMatrix',
  input: semEntrada,
  policy: policies.anyRole('admin'),
  handler: async ({ ctx, db }) => {
    const zone = await getShopTimeZone(db, ctx.barbeariaId)
    const dataLocal = localDate(ctx.clock.now(), parseTimeZone(zone))
    return ok({ celulas: await listMatrix(db, ctx.barbeariaId, dataLocal) })
  },
})

export const createServiceOperation = defineCommand({
  name: 'catalog.createService',
  input: dadosServico,
  policy: policies.anyRole('admin'),
  requireRecentAuth: true,
  handler: async ({ ctx, input, tx }) => createService(tx, ctx, input),
})

export const createComboOperation = defineCommand({
  name: 'catalog.createCombo',
  input: dadosServico.extend({ componenteIds: z.array(uuidSchema).min(2) }),
  policy: policies.anyRole('admin'),
  requireRecentAuth: true,
  handler: async ({ ctx, input, tx }) => createCombo(tx, ctx, input),
})

export const updateServiceOperation = defineCommand({
  name: 'catalog.updateService',
  input: identificador.extend({
    precoCentavos: centavosSchema.min(1),
    duracaoMinutos: z.number().int().min(1),
  }),
  policy: policies.anyRole('admin'),
  requireRecentAuth: true,
  revision: 'required',
  handler: async ({ ctx, input, tx, expectedRevision }) =>
    updateService(tx, ctx, catalogDependencies, input, expectedRevision),
})

export const deactivateServiceOperation = defineCommand({
  name: 'catalog.deactivateService',
  input: identificador,
  policy: policies.anyRole('admin'),
  requireRecentAuth: true,
  revision: 'required',
  handler: async ({ ctx, input, tx, expectedRevision }) =>
    deactivateService(tx, ctx, input, expectedRevision),
})

export const changeEnablementOperation = defineCommand({
  name: 'catalog.changeEnablement',
  input: z.object({
    barbeiroId: uuidSchema,
    servicoId: uuidSchema,
    habilitado: z.boolean(),
  }),
  policy: policies.anyRole('admin'),
  requireRecentAuth: true,
  handler: async ({ ctx, input, tx }) => changeEnablement(tx, ctx, catalogDependencies, input),
})

export const scheduleCommissionOperation = defineCommand({
  name: 'catalog.scheduleCommission',
  input: z.object({
    barbeiroId: uuidSchema,
    servicoId: uuidSchema,
    percentualAvulsoBp: z.number().int().min(0).max(10_000),
    percentualAssinanteBp: z.number().int().min(0).max(10_000).optional(),
    inicio: dataLocalSchema,
  }),
  policy: policies.anyRole('admin'),
  requireRecentAuth: true,
  handler: async ({ ctx, input, tx }) => {
    const percentualAssinanteBp = input.percentualAssinanteBp ?? input.percentualAvulsoBp
    if (percentualAssinanteBp < 0 || percentualAssinanteBp > 10_000) {
      throw CatalogErrors.INVALID_COMMISSION()
    }
    return scheduleCommission(tx, ctx, catalogDependencies, { ...input, percentualAssinanteBp })
  },
})

export const getServiceOperation = defineQuery({
  name: 'catalog.getService',
  input: identificador,
  policy: policies.anyRole('admin'),
  handler: async ({ ctx, input, db }) => {
    const servicos = await listAdminCatalog(db, ctx.barbeariaId)
    const servico = servicos.find((item) => item.id === input.servicoId)
    if (!servico) throw CatalogErrors.SERVICE_NOT_FOUND()
    return ok({ servico })
  },
})
