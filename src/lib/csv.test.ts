import { describe, expect, it } from "vitest";
import { centsToDecimal, toCsv } from "./csv";

describe("toCsv", () => {
  it("usa ;, BOM e CRLF", () => {
    const csv = toCsv(["Nome", "Valor"], [["João", "45,00"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe("﻿Nome;Valor\r\nJoão;45,00\r\n");
  });
  it("escapa aspas, ponto e vírgula e quebras", () => {
    expect(toCsv(["a"], [['Diz "oi"; tchau']])).toContain('"Diz ""oi""; tchau"');
    expect(toCsv(["a"], [[null], [undefined], [3]])).toBe("﻿a\r\n\r\n\r\n3\r\n");
  });
  it("centavos em decimal brasileiro", () => {
    expect(centsToDecimal(4500)).toBe("45,00");
    expect(centsToDecimal(5)).toBe("0,05");
  });
});
