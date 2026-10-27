import { describe, expect, it } from "vitest";
import { splitAddress } from "./address";

describe("splitAddress", () => {
  it("separa a rua do bairro e da cidade", () => {
    expect(splitAddress("Rua Alfa, 123 - Vila Bocaina - Mauá/SP")).toEqual({
      street: "Rua Alfa, 123",
      area: "Vila Bocaina - Mauá/SP",
    });
  });

  it("mantém tudo na primeira linha quando não há separador", () => {
    expect(splitAddress("Rua Alfa, 123, Mauá")).toEqual({ street: "Rua Alfa, 123, Mauá", area: null });
  });
});
