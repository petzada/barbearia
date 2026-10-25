import { describe, expect, it } from "vitest";
import { countLabel } from "./utils";

describe("countLabel", () => {
  it("usa o singular só para 1", () => {
    expect(countLabel(1, "atendimento", "atendimentos")).toBe("1 atendimento");
    expect(countLabel(0, "atendimento", "atendimentos")).toBe("0 atendimentos");
    expect(countLabel(3, "avaliação", "avaliações")).toBe("3 avaliações");
  });
});
