// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BottomSheet } from "./bottom-sheet";

function renderSheet(onOpenChange = vi.fn()) {
  render(
    <BottomSheet open onOpenChange={onOpenChange} title="Detalhes" footer={<button type="button">Salvar</button>}>
      <p>Conteúdo</p>
    </BottomSheet>,
  );
  return onOpenChange;
}

describe("BottomSheet", () => {
  it("mostra título, conteúdo e rodapé num diálogo acessível", () => {
    renderSheet();
    const dialog = screen.getByRole("dialog", { name: "Detalhes" });
    expect(dialog).toHaveTextContent("Conteúdo");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  });

  it("fecha pelo botão Fechar", () => {
    const onOpenChange = renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it("fecha ao arrastar a alça para baixo além do limite", () => {
    const onOpenChange = renderSheet();
    const handle = screen.getByTestId("sheet-drag-area");
    fireEvent.pointerDown(handle, { button: 0, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 150, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 260, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 260, pointerId: 1 });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("não fecha num arraste curto e lento", () => {
    const onOpenChange = renderSheet();
    const now = vi.spyOn(performance, "now");
    now.mockReturnValueOnce(0).mockReturnValue(1000);
    const handle = screen.getByTestId("sheet-drag-area");
    fireEvent.pointerDown(handle, { button: 0, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 140, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 140, pointerId: 1 });
    expect(onOpenChange).not.toHaveBeenCalled();
    now.mockRestore();
  });
});
