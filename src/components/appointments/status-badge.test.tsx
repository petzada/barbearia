// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ENTRY_STATUS_BADGE, STATUS_ACCENT } from "./status";
import { PaymentBadge, StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("falta é sempre warning (nunca verde de sucesso)", () => {
    expect(ENTRY_STATUS_BADGE.no_show.variant).toBe("warning");
    expect(STATUS_ACCENT.warning.text).toBe("text-warning-ink");
    render(<StatusBadge status="no_show" />);
    expect(screen.getByText(ENTRY_STATUS_BADGE.no_show.label)).toHaveAttribute("data-variant", "warning");
  });

  it("concluído usa success e cancelado usa muted", () => {
    render(
      <>
        <StatusBadge status="completed" />
        <StatusBadge status="cancelled" />
      </>,
    );
    expect(screen.getByText(ENTRY_STATUS_BADGE.completed.label)).toHaveAttribute("data-variant", "success");
    expect(screen.getByText(ENTRY_STATUS_BADGE.cancelled.label)).toHaveAttribute("data-variant", "muted");
  });

  it("PaymentBadge usa o dicionário único de pagamento", () => {
    const { container } = render(<PaymentBadge method={null} status={null} />);
    expect(container).toBeEmptyDOMElement();
    render(<PaymentBadge method="local" status="unpaid" />);
    expect(screen.getByText("Pagar na barbearia")).toHaveAttribute("data-variant", "muted");
  });
});
