import type { AnyOperation } from './operation'

/** Registro das operações do processo. O dispatcher busca aqui pelo nome que o navegador enviou. */
export class OperationRegistry {
  private readonly operations = new Map<string, AnyOperation>()

  register(operation: AnyOperation): void {
    // Em dev o HMR reavalia o módulo da operação: nesse caso a nova definição substitui a antiga.
    if (this.operations.has(operation.name) && !import.meta.hot) {
      throw new Error(`Operação duplicada: "${operation.name}".`)
    }
    this.operations.set(operation.name, operation)
  }

  get(name: string): AnyOperation | undefined {
    return this.operations.get(name)
  }

  list(): readonly AnyOperation[] {
    return [...this.operations.values()]
  }

  /** Só para testes. */
  clear(): void {
    this.operations.clear()
  }
}

export const defaultRegistry = new OperationRegistry()
