import { describe, expect, it } from "vitest";
import {
  maskSecret,
  mergeEnv,
  normalizeBrPhone,
  normalizePhoneList,
  parseEnvFile,
  serializeEnv,
  webhookUrls,
} from "./env-file.mjs";
import { findD1, hasR2Bucket, readD1DatabaseId, setD1DatabaseId } from "./jsonc.mjs";

describe("arquivo .dev.vars", () => {
  it("lê, mescla mantendo valores e serializa", () => {
    const env = parseEnvFile('# comentário\nA=1\nB="com espaço"\n\nC=\n');
    expect([...env]).toEqual([["A", "1"], ["B", "com espaço"], ["C", ""]]);
    const merged = mergeEnv(env, { A: "", B: undefined, D: "novo" });
    expect(merged.get("A")).toBe("1");
    expect(merged.get("D")).toBe("novo");
    const text = serializeEnv(merged);
    expect(text).toContain('B="com espaço"');
    expect(parseEnvFile(text).get("B")).toBe("com espaço");
  });
  it("mascara segredos", () => {
    expect(maskSecret("abcdefghijkl")).toBe("abcd••••ijkl");
    expect(maskSecret("abc")).toBe("•••");
    expect(maskSecret("")).toBe("(vazio)");
  });
  it("normaliza telefones de admin", () => {
    expect(normalizeBrPhone("(11) 98765-4321")).toBe("5511987654321");
    expect(normalizeBrPhone("123")).toBeNull();
    expect(normalizePhoneList("11987654321, 5511987654321;21912345678")).toEqual({
      ok: true,
      value: "5511987654321,5521912345678",
    });
    expect(normalizePhoneList("11987654321, 99")).toEqual({ ok: false, invalid: "99" });
  });
  it("monta URLs dos webhooks e do Google", () => {
    const env = new Map([["WHATSMIAU_WEBHOOK_SECRET", "w s"], ["ABACATEPAY_WEBHOOK_SECRET", "abc"]]);
    expect(webhookUrls("https://app.test/", env)).toEqual({
      whatsmiau: "https://app.test/api/webhooks/whatsmiau?secret=w%20s",
      abacatepay: "https://app.test/api/webhooks/abacatepay?webhookSecret=abc",
      googleRedirect: "https://app.test/api/auth/callback/google",
    });
  });
});

describe("wrangler.jsonc", () => {
  const jsonc = `{
  // comentário
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "x",
      // id do banco
      "database_id": "00000000-0000-0000-0000-000000000000",
      "migrations_dir": "drizzle/migrations"
    }
  ]
}`;
  it("troca o database_id preservando comentários", () => {
    const id = "38d418bb-2ff0-4b51-a493-f1af62094f2f";
    expect(readD1DatabaseId(jsonc)).toBeNull();
    const next = setD1DatabaseId(jsonc, id);
    expect(next).toContain(`"database_id": "${id}"`);
    expect(next).toContain("// id do banco");
    expect(readD1DatabaseId(next)).toBe(id);
    expect(() => setD1DatabaseId(jsonc, "nope")).toThrow();
  });
  it("acha D1 e bucket nas saídas do wrangler", () => {
    expect(findD1([{ name: "barbearia-do-moura", uuid: "u-1" }], "barbearia-do-moura")).toBe("u-1");
    expect(findD1([], "barbearia-do-moura")).toBeNull();
    expect(hasR2Bucket("name:          barbearia-do-moura-media\ncreation_date: x", "barbearia-do-moura-media")).toBe(true);
    expect(hasR2Bucket("name: outro", "barbearia-do-moura-media")).toBe(false);
  });
});
