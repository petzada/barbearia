// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RatingInput, RatingStars } from "./rating-stars";

describe("RatingStars", () => {
  it("modo estrelas: rótulo com a nota e estrelas arredondadas", () => {
    const { container } = render(<RatingStars rating={4.6} />);
    expect(screen.getByRole("img", { name: "4,6 de 5 estrelas" })).toBeInTheDocument();
    expect(container.querySelectorAll("svg.fill-warning")).toHaveLength(5);
  });

  it("modo compacto: inteiro para nota individual, uma casa para média", () => {
    const { rerender } = render(<RatingStars rating={4} variant="compact" />);
    expect(screen.getByText("4")).toBeInTheDocument();
    rerender(<RatingStars rating={5} variant="compact" average count={12} />);
    expect(screen.getByText("5,0")).toBeInTheDocument();
    expect(screen.getByText(/12 avaliações/)).toBeInTheDocument();
  });
});

describe("RatingInput", () => {
  it("radiogroup de 1 a 5 com seleção", () => {
    const onChange = vi.fn();
    render(<RatingInput value={3} onChange={onChange} />);
    const group = screen.getByRole("radiogroup", { name: "Nota de 1 a 5" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "3 estrelas" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "1 estrela" }));
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
