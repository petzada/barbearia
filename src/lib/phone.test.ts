import { describe, expect, it } from "vitest";
import {
  formatBrazilPhone,
  isE164BrazilPhone,
  maskBrazilPhoneInput,
  normalizeBrazilPhone,
  toE164BrazilPhone,
} from "./phone";

describe("normalizeBrazilPhone (portado do barbeariadomoura)", () => {
  it("adiciona DDI 55 a números locais", () => {
    expect(normalizeBrazilPhone("(11) 96023-4545")).toEqual({
      isValid: true,
      normalized: "5511960234545",
    });
  });
  it("aceita prefixo internacional 00 e fixo com 8 dígitos", () => {
    expect(normalizeBrazilPhone("005511960234545").normalized).toBe("5511960234545");
    expect(normalizeBrazilPhone("1140028922").normalized).toBe("551140028922");
  });
  it("rejeita DDD inválido e números curtos", () => {
    expect(normalizeBrazilPhone("(01) 96023-4545").isValid).toBe(false);
    expect(normalizeBrazilPhone("12345").isValid).toBe(false);
    expect(normalizeBrazilPhone("").reason).toBe("Telefone ausente.");
  });
});

describe("formatos do login", () => {
  it("converte para E.164 e valida", () => {
    expect(toE164BrazilPhone("11 96023-4545")).toBe("+5511960234545");
    expect(toE164BrazilPhone("abc")).toBeNull();
    expect(isE164BrazilPhone("+5511960234545")).toBe(true);
    expect(isE164BrazilPhone("+55119602345")).toBe(false);
    expect(isE164BrazilPhone("+5501960234545")).toBe(false);
  });
  it("formata para exibição e mascara a digitação", () => {
    expect(formatBrazilPhone("+5511960234545")).toBe("(11) 96023-4545");
    expect(maskBrazilPhoneInput("1196023")).toBe("(11) 9602-3");
    expect(maskBrazilPhoneInput("11960234545")).toBe("(11) 96023-4545");
    expect(maskBrazilPhoneInput("5511960234545")).toBe("(11) 96023-4545");
  });
});
