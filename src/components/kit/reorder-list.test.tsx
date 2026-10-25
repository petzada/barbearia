// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { moveItem, ReorderList } from "./reorder-list";

const items = [
  { id: "corte", name: "Corte" },
  { id: "barba", name: "Barba" },
  { id: "combo", name: "Combo" },
];

describe("ReorderList (ordem dos serviços)", () => {
  it("move pelo teclado na alça e confirma a nova ordem", () => {
    const onCommit = vi.fn();
    render(<ReorderList items={items} onCommit={onCommit} itemLabel={(i) => i.name} renderItem={(i) => <span>{i.name}</span>} />);
    fireEvent.keyDown(screen.getByRole("button", { name: /Reordenar Combo/ }), { key: "ArrowUp" });
    expect(onCommit).toHaveBeenCalledWith(["corte", "combo", "barba"]);
    expect(screen.getAllByText(/^(Corte|Barba|Combo)$/).map((n) => n.textContent)).toEqual(["Corte", "Combo", "Barba"]);
  });

  it("não sai dos limites da lista", () => {
    const onCommit = vi.fn();
    render(<ReorderList items={items} onCommit={onCommit} itemLabel={(i) => i.name} renderItem={(i) => <span>{i.name}</span>} />);
    fireEvent.keyDown(screen.getByRole("button", { name: /Reordenar Corte/ }), { key: "ArrowUp" });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("moveItem", () => {
    expect(moveItem([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
    expect(moveItem([1, 2, 3], 0, 5)).toEqual([1, 2, 3]);
  });
});
