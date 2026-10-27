/**
 * Primeiro nome de cada pessoa; quando dois compartilham o primeiro nome,
 * acrescenta a inicial do último sobrenome ("João S.", "João P.").
 */
export function shortNames(people: { id: string; name: string }[]): Map<string, string> {
  const first = (name: string) => name.trim().split(/\s+/)[0] ?? name;
  const counts = new Map<string, number>();
  for (const p of people) counts.set(first(p.name).toLowerCase(), (counts.get(first(p.name).toLowerCase()) ?? 0) + 1);
  return new Map(
    people.map((p) => {
      const parts = p.name.trim().split(/\s+/);
      const short = parts[0] ?? p.name;
      const repeated = (counts.get(short.toLowerCase()) ?? 0) > 1 && parts.length > 1;
      return [p.id, repeated ? `${short} ${parts[parts.length - 1][0].toUpperCase()}.` : short];
    }),
  );
}
