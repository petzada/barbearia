// Tudo que cruza a fronteira servidor → navegador (e tudo que é gravado como resultado de idempotência)
// é JSON puro. `Jsonify` mostra no tipo o que o cliente realmente recebe (Date vira string ISO).
export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

type Dropped = undefined | symbol | ((...args: never[]) => unknown)

export type Jsonify<T> = T extends JsonPrimitive
  ? T
  : T extends Date
    ? string
    : T extends bigint | Dropped
      ? never
      : T extends readonly (infer Item)[]
        ? Jsonify<Item>[]
        : T extends object
          ? { [K in keyof T as T[K] extends Dropped ? never : K]: Jsonify<T[K]> }
          : never
