import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

// ÚNICO `createServerFn` do sistema (PRD §7.3, D0015). O compilador do TanStack Start só extrai o handler
// de `createServerFn` escrito direto no módulo; dentro de uma função fábrica o handler continuaria no
// bundle do navegador. Por isso `defineQuery`/`defineCommand` não criam server functions: registram a
// operação no servidor, e toda chamada do navegador passa por este ponto, que aplica a política, a
// validação, a idempotência e a auditoria. `tests/security` falha se houver `createServerFn` em outro arquivo.
//
// O handler abaixo é removido do bundle do navegador; `dispatch.server` (e tudo que ele importa) nunca vai
// para o cliente.
export const executeOperationFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      operation: z.string().min(3).max(120),
      input: z.json(),
    }),
  )
  .handler(async ({ data }) => {
    const { dispatchOperation } = await import('./dispatch.server')
    return dispatchOperation(data.operation, data.input)
  })
