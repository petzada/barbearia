/**
 * Quebra o endereço da gestão ("Rua, número - bairro - cidade") em duas linhas:
 * a rua no topo e o bairro/cidade embaixo. Sem " - ", fica tudo na primeira.
 */
export function splitAddress(address: string): { street: string; area: string | null } {
  const [street, ...rest] = address.split(/\s+[-–]\s+/).map((part) => part.trim());
  const area = rest.filter(Boolean).join(" - ");
  return { street, area: area || null };
}
