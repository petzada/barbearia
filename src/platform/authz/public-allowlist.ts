/**
 * Allowlist das operações `public` (PRD §7.3, D0015: "nenhuma server function fica pública por esquecimento").
 *
 * Só entra aqui operação sem sessão e sem PII (catálogo público, boas-vindas, versão/saúde).
 * Adicionar um nome exige a task dona + revisão: `defineQuery`/`defineCommand` com `policy: public`
 * falham ao carregar se o nome não estiver nesta lista, e `tests/security` falha se um nome da lista
 * não tiver operação registrada.
 *
 * Formato do nome: `<modulo>.<operacao>` (ex.: `catalog.listarServicos`).
 */
export const PUBLIC_OPERATIONS: readonly string[] = [
  'catalog.listPublicCatalog',
  'catalog.listPublicBarbers',
]
