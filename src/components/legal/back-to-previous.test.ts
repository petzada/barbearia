import { describe, expect, it } from "vitest";
import { previousAppPath } from "./back-to-previous";
import { PREV_PATH_KEY, recordNavigation } from "@/components/navigation-tracker";

function memoryStorage() {
  const map = new Map<string, string>();
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) };
}

describe("voltar das páginas legais", () => {
  it("registra a rota anterior a cada troca de página", () => {
    const s = memoryStorage();
    recordNavigation(s, "/inicio");
    recordNavigation(s, "/perfil");
    recordNavigation(s, "/termos");
    expect(s.getItem(PREV_PATH_KEY)).toBe("/perfil");
    recordNavigation(s, "/termos"); // mesma rota (ex.: âncora) não muda nada
    expect(s.getItem(PREV_PATH_KEY)).toBe("/perfil");
  });

  it("volta para a tela anterior do app, com query", () => {
    expect(previousAppPath("/perfil", "/termos")).toBe("/perfil");
    expect(previousAppPath("/agendamentos?aba=historico", "/privacidade")).toBe("/agendamentos?aba=historico");
  });

  it("usa o fallback sem tela anterior válida", () => {
    expect(previousAppPath(null, "/termos")).toBeNull();
    expect(previousAppPath("//evil.com", "/termos")).toBeNull();
    expect(previousAppPath("https://evil.com", "/termos")).toBeNull();
    expect(previousAppPath("/termos?x=1", "/termos")).toBeNull();
  });
});
