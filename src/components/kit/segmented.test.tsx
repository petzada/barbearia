// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Segmented, SegmentedNav } from "./segmented";

describe("Segmented", () => {
  it("marca a opção atual com aria-checked e avisa a troca", () => {
    const onChange = vi.fn();
    render(
      <Segmented
        label="Tipo"
        value="encaixe"
        onChange={onChange}
        options={[
          { value: "encaixe", label: "Encaixe" },
          { value: "bloqueio", label: "Bloqueio" },
        ]}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "Tipo" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Encaixe" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Bloqueio" })).toHaveAttribute("aria-checked", "false");
    fireEvent.click(screen.getByRole("radio", { name: "Bloqueio" }));
    expect(onChange).toHaveBeenCalledWith("bloqueio");
  });
});

describe("SegmentedNav", () => {
  it("usa links com aria-current (nunca aria-pressed)", () => {
    render(
      <SegmentedNav
        label="Abas"
        items={[
          { href: "/a", label: "Próximos", current: true },
          { href: "/b", label: "Histórico", current: false },
        ]}
      />,
    );
    const current = screen.getByRole("link", { name: "Próximos" });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).not.toHaveAttribute("aria-pressed");
    expect(screen.getByRole("link", { name: "Histórico" })).not.toHaveAttribute("aria-current");
  });
});
