// Edição mínima do wrangler.jsonc preservando comentários e formatação.

const PLACEHOLDER = "00000000-0000-0000-0000-000000000000";

/** Troca o database_id do binding D1 informado (por padrão "DB"). */
export function setD1DatabaseId(text, databaseId, binding = "DB") {
  if (!/^[0-9a-f-]{36}$/i.test(databaseId)) throw new Error(`database_id inválido: ${databaseId}`);
  const bindingIdx = text.search(new RegExp(`"binding"\\s*:\\s*"${binding}"`));
  if (bindingIdx === -1) throw new Error(`binding D1 "${binding}" não encontrado no wrangler.jsonc`);
  const objStart = text.lastIndexOf("{", bindingIdx);
  const objEnd = text.indexOf("}", bindingIdx);
  const block = text.slice(objStart, objEnd);
  const replaced = block.replace(/("database_id"\s*:\s*")[^"]*(")/, `$1${databaseId}$2`);
  if (replaced === block && !block.includes(databaseId)) throw new Error('campo "database_id" não encontrado');
  return text.slice(0, objStart) + replaced + text.slice(objEnd);
}

export function readD1DatabaseId(text, binding = "DB") {
  const bindingIdx = text.search(new RegExp(`"binding"\\s*:\\s*"${binding}"`));
  if (bindingIdx === -1) return null;
  const block = text.slice(text.lastIndexOf("{", bindingIdx), text.indexOf("}", bindingIdx));
  const id = block.match(/"database_id"\s*:\s*"([^"]*)"/)?.[1] ?? null;
  return id && id !== PLACEHOLDER ? id : null;
}

/** Acha um banco D1 pelo nome na saída de `wrangler d1 list --json`. */
export function findD1(listJson, name) {
  const list = Array.isArray(listJson) ? listJson : (listJson?.result ?? []);
  const db = list.find((d) => d?.name === name);
  return db ? (db.uuid ?? db.database_id ?? db.id ?? null) : null;
}

/** Acha o bucket na saída de `wrangler r2 bucket list` (texto "name: X"). */
export function hasR2Bucket(listOutput, name) {
  return new RegExp(`(^|\\s)name:\\s*${name.replace(/[-]/g, "\\-")}\\s*$`, "m").test(listOutput);
}
