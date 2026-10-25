// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ChipGroup, OptionCard, OptionGroup } from "./option-card";
import { Segmented } from "./segmented";

describe("OptionGroup", () => {
  it("mostra o rótulo visível e o usa como nome do radiogroup (sem duplicar)", () => {
    render(
      <OptionGroup label="Como você prefere pagar?">
        <OptionCard selected onSelect={vi.fn()} title="Pix agora" description="QR na hora" />
      </OptionGroup>,
    );
    expect(screen.getAllByText("Como você prefere pagar?")).toHaveLength(1);
    expect(screen.getByRole("radiogroup", { name: "Como você prefere pagar?" })).toBeInTheDocument();
  });
});

describe("ChipGroup", () => {
  it("opções curtas como chips de rádio com dica de preço", () => {
    const onChange = vi.fn();
    render(
      <ChipGroup
        label="Plano"
        value="a"
        onChange={onChange}
        options={[
          { value: "a", label: "Mensal", hint: "R$ 89,00" },
          { value: "b", label: "Premium", hint: "R$ 129,00" },
        ]}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "Plano" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Mensal/ })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: /Premium/ }));
    expect(onChange).toHaveBeenCalledWith("b");
  });
});

describe("Segmented com rótulo", () => {
  it("showLabel exibe o rótulo e liga via aria-labelledby", () => {
    render(
      <Segmented
        showLabel
        label="Forma de pagamento"
        value="pix"
        onChange={vi.fn()}
        options={[
          { value: "pix", label: "Pix" },
          { value: "dinheiro", label: "Dinheiro" },
        ]}
      />,
    );
    expect(screen.getByText("Forma de pagamento")).toBeVisible();
    expect(screen.getByRole("radiogroup", { name: "Forma de pagamento" })).toBeInTheDocument();
  });
});
