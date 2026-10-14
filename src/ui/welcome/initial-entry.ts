// Importado pelo __root para executar na carga inicial do navegador, antes de qualquer navegação.
// Guarda a primeira URL da visita: se não era a entrada ("/"), a visita é um deep link e as
// boas-vindas não aparecem (D0048). Em módulo próprio porque um chunk carregado depois de navegar
// veria o endereço já alterado.
let entradaInicial: string | null = null

export function registerInitialEntry(pathname: string): void {
  entradaInicial ??= pathname
}

export function enteredByDeepLink(): boolean {
  return entradaInicial !== null && entradaInicial !== '/'
}

/** Só para testes. */
export function resetInitialEntry(): void {
  entradaInicial = null
}

if (typeof window !== 'undefined') registerInitialEntry(window.location.pathname)
