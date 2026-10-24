import { describe, expect, it } from "vitest";
import { availableModes, resolveMode } from "./modes";

describe("modos de uso", () => {
  const client = { isAdmin: false, isBarber: false };
  const barber = { isAdmin: false, isBarber: true };
  const moura = { isAdmin: true, isBarber: true };

  it("lista modos conforme os papéis", () => {
    expect(availableModes(client)).toEqual(["cliente"]);
    expect(availableModes(barber)).toEqual(["cliente", "barbeiro"]);
    expect(availableModes(moura)).toEqual(["cliente", "barbeiro", "admin"]);
  });

  it("respeita a preferência só quando permitida", () => {
    expect(resolveMode(moura)).toBe("admin");
    expect(resolveMode(moura, "barbeiro")).toBe("barbeiro");
    expect(resolveMode(client, "admin")).toBe("cliente");
    expect(resolveMode(barber, "lixo")).toBe("barbeiro");
  });
});
