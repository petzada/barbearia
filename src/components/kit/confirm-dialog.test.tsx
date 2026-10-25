// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ConfirmDialog } from "./confirm-dialog";

function renderDialog(onConfirm: () => void | boolean | Promise<void | boolean>) {
  render(
    <ConfirmDialog
      trigger={<button type="button">Remover bloqueio</button>}
      title="Remover este bloqueio?"
      description="O horário volta a ficar livre."
      confirmLabel="Remover bloqueio"
      onConfirm={onConfirm}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Remover bloqueio" }));
  return screen.getByRole("alertdialog", { name: "Remover este bloqueio?" });
}

describe("ConfirmDialog", () => {
  it("abre pelo gatilho com pergunta, consequência e Manter", () => {
    const dialog = renderDialog(vi.fn());
    expect(dialog).toHaveTextContent("O horário volta a ficar livre.");
    expect(screen.getByRole("button", { name: "Manter" })).toBeInTheDocument();
  });

  it("Manter fecha sem confirmar", async () => {
    const onConfirm = vi.fn();
    renderDialog(onConfirm);
    fireEvent.click(screen.getByRole("button", { name: "Manter" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirma e fecha", async () => {
    const onConfirm = vi.fn();
    const dialog = renderDialog(onConfirm);
    fireEvent.click(within(dialog).getByRole("button", { name: "Remover bloqueio" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("continua aberto quando onConfirm devolve false", async () => {
    const onConfirm = vi.fn(async () => false);
    const dialog = renderDialog(onConfirm);
    fireEvent.click(within(dialog).getByRole("button", { name: "Remover bloqueio" }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce());
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Remover bloqueio" })).not.toBeDisabled());
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
