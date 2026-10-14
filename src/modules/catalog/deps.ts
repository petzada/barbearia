import { FakeOutbox, FakeStorageProvider } from '~/contracts/fakes'
import type { Outbox, StorageProvider } from '~/contracts'
import { systemClock } from '~/platform/time'

/**
 * T03/T08 ainda não fornecem adaptadores reais neste checkout. O módulo mantém os ports substituíveis;
 * os fakes deixam operações e testes exercitáveis até a integração por task proprietária.
 */
export interface CatalogDependencies {
  readonly outbox: Outbox
  readonly storage: StorageProvider
}

export const catalogDependencies: CatalogDependencies = {
  outbox: new FakeOutbox(),
  storage: new FakeStorageProvider(systemClock),
}
