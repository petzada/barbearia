import { describe, expect, it } from "vitest";
import { shortNames } from "./short-names";

describe("shortNames", () => {
  it("usa o primeiro nome e a inicial do sobrenome só quando repete", () => {
    const names = shortNames([
      { id: "a", name: "Moura Barbosa Silva" },
      { id: "b", name: "João Pedro Santos" },
      { id: "c", name: "joão Paulo" },
      { id: "d", name: "Léo" },
    ]);
    expect([...names.values()]).toEqual(["Moura", "João S.", "joão P.", "Léo"]);
  });
});
