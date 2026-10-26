// @vitest-environment jsdom
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BottomSheet } from "./bottom-sheet";
import { useSheetState } from "./use-sheet-state";

function renderSheet(onOpenChange = vi.fn()) {
  render(
    <BottomSheet open onOpenChange={onOpenChange} title="Detalhes" footer={<button type="button">Salvar</button>}>
      <p>Conteúdo</p>
      <input aria-label="Preço" />
    </BottomSheet>,
  );
  return onOpenChange;
}

describe("BottomSheet (Drawer do Base UI)", () => {
  it("mostra título, conteúdo e rodapé num diálogo acessível", () => {
    renderSheet();
    const dialog = screen.getByRole("dialog", { name: "Detalhes" });
    expect(dialog).toHaveTextContent("Conteúdo");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  });

  it("fecha pelo botão Fechar", () => {
    const onOpenChange = renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("tira o foco do campo (recolhe o teclado) ao fechar", () => {
    const onOpenChange = renderSheet();
    const input = screen.getByLabelText("Preço");
    input.focus();
    expect(document.activeElement).toBe(input);
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(document.activeElement).not.toBe(input);
  });
});

/** Lista que edita itens numa folha, como Serviços e Planos. */
function Editor() {
  const sheet = useSheetState<string>();
  const [saved, setSaved] = useState<string[]>([]);
  return (
    <>
      {["Corte", "Barba"].map((name) => (
        <button key={name} type="button" onClick={() => sheet.show(name)}>
          Editar {name}
        </button>
      ))}
      <p>Salvos: {saved.join(", ")}</p>
      <BottomSheet key={sheet.key} open={sheet.open} onOpenChange={sheet.onOpenChange} title={`Editar ${sheet.item ?? ""}`}>
        <button
          type="button"
          onClick={() => {
            setSaved((s) => [...s, sheet.item ?? ""]);
            sheet.hide();
          }}
        >
          Salvar
        </button>
      </BottomSheet>
    </>
  );
}

describe("useSheetState", () => {
  it("mantém a folha montada (mesma key) ao fechar e troca de key só ao abrir", async () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Corte" }));
    const dialog = await screen.findByRole("dialog", { name: "Editar Corte" });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    // Durante a saída o conteúdo continua com o último item (não desmonta).
    expect(dialog).toHaveTextContent("Editar Corte");
    expect(screen.getByText("Salvos: Corte")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Editar Barba" }));
    });
    expect(await screen.findByRole("dialog", { name: "Editar Barba" })).toBeInTheDocument();
  });
});
