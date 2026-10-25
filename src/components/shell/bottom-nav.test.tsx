// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BottomNav } from "./bottom-nav";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

function activeLabels() {
  return screen
    .getAllByRole("link")
    .filter((a) => a.getAttribute("aria-current") === "page")
    .map((a) => a.getAttribute("aria-label") ?? a.textContent);
}

describe("BottomNav", () => {
  it("cliente: Início ativo e Agendar como botão central", () => {
    pathname = "/inicio";
    render(<BottomNav mode="cliente" />);
    expect(activeLabels()).toEqual(["Início"]);
    expect(screen.getByRole("link", { name: "Agendar" })).toHaveAttribute("href", "/agendar");
    expect(screen.getAllByRole("link")).toHaveLength(5);
  });

  it("cliente: subpáginas de agendamentos mantêm a aba ativa", () => {
    pathname = "/agendamentos/abc/pix";
    render(<BottomNav mode="cliente" />);
    expect(activeLabels()).toEqual(["Agendamentos"]);
  });

  it("barbeiro: 'Hoje' só na rota exata; Agenda ativa nas subrotas", () => {
    pathname = "/barbeiro/agenda";
    render(<BottomNav mode="barbeiro" />);
    expect(activeLabels()).toEqual(["Agenda"]);
  });

  it("gestão: perfil e subrotas de gestão ativam 'Gestão'", () => {
    pathname = "/admin/gestao/servicos";
    const { unmount } = render(<BottomNav mode="admin" />);
    expect(activeLabels()).toEqual(["Gestão"]);
    unmount();
    pathname = "/admin";
    render(<BottomNav mode="admin" />);
    expect(activeLabels()).toEqual(["Painel"]);
  });
});
