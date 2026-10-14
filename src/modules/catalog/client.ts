import { remoteOperation } from '~/platform/context/client'
import type {
  changeEnablementOperation,
  createComboOperation,
  createServiceOperation,
  deactivateServiceOperation,
  listAdminCatalogOperation,
  listMatrixOperation,
  listPublicBarbersOperation,
  listPublicCatalogOperation,
  scheduleCommissionOperation,
  updateServiceOperation,
} from './server'

export const listPublicCatalog = remoteOperation<typeof listPublicCatalogOperation>(
  'catalog.listPublicCatalog',
)
export const listPublicBarbers = remoteOperation<typeof listPublicBarbersOperation>(
  'catalog.listPublicBarbers',
)
export const listAdminCatalog = remoteOperation<typeof listAdminCatalogOperation>(
  'catalog.listAdminCatalog',
)
export const listMatrix = remoteOperation<typeof listMatrixOperation>('catalog.listMatrix')
export const createService = remoteOperation<typeof createServiceOperation>('catalog.createService')
export const createCombo = remoteOperation<typeof createComboOperation>('catalog.createCombo')
export const updateService = remoteOperation<typeof updateServiceOperation>('catalog.updateService')
export const deactivateService = remoteOperation<typeof deactivateServiceOperation>(
  'catalog.deactivateService',
)
export const changeEnablement = remoteOperation<typeof changeEnablementOperation>(
  'catalog.changeEnablement',
)
export const scheduleCommission = remoteOperation<typeof scheduleCommissionOperation>(
  'catalog.scheduleCommission',
)
