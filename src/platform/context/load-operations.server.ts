// Somente servidor. Cada módulo expõe as suas operações em `modules/<m>/server.ts` (PRD §7.2); importar o
// arquivo basta para registrá-las (`defineQuery`/`defineCommand`). T04 também registra o `SessionResolver`
// ali. O glob é preguiçoso e roda uma vez por processo.
const arquivosDeOperacoes = import.meta.glob('../../modules/*/server.ts')

let carregamento: Promise<void> | undefined

export function loadOperationModules(): Promise<void> {
  carregamento ??= Promise.all(
    Object.values(arquivosDeOperacoes).map((carregar) => carregar()),
  ).then(() => undefined)
  return carregamento
}
