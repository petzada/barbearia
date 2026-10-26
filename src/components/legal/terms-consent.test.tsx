// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TermsConsent } from "./terms-consent";

describe("TermsConsent", () => {
  it("começa desmarcado, com links para os textos em nova aba", () => {
    const onChange = vi.fn();
    render(<TermsConsent checked={false} onCheckedChange={onChange} />);
    const box = screen.getByRole("checkbox");
    expect(box).not.toBeChecked();
    expect(screen.getByRole("link", { name: "Termos de Uso" })).toHaveAttribute("href", "/termos");
    expect(screen.getByRole("link", { name: "Política de Privacidade" })).toHaveAttribute("target", "_blank");
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
