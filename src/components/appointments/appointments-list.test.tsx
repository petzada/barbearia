// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppointmentSheet, type AppointmentListItem } from "./appointments-list";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/app/actions/cliente", () => ({
  cancelMyAppointmentAction: vi.fn(),
  submitFeedbackAction: vi.fn(),
}));

const base: AppointmentListItem = {
  past: false,
  id: "e1",
  startsAt: Date.parse("2026-11-02T18:00:00Z"),
  endsAt: Date.parse("2026-11-02T18:30:00Z"),
  status: "booked",
  serviceId: "svc-corte",
  serviceName: "Corte",
  barberId: "b1",
  barberName: "Moura",
  priceCents: 4500,
  paymentMethod: "pix",
  paymentStatus: "pending",
  canCancel: true,
  cancelHint: null,
  canPay: true,
  hasPendingPix: true,
  canReview: false,
};

describe("AppointmentSheet (ações por estado)", () => {
  it("próximo com Pix pendente: pagar e cancelar, sem avaliar", () => {
    render(<AppointmentSheet item={base} onClose={vi.fn()} />);
    expect(screen.getByRole("link", { name: /ver pix/i })).toHaveAttribute("href", "/agendamentos/e1/pix");
    expect(screen.getByRole("button", { name: /cancelar agendamento/i })).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("dentro do prazo de cancelamento: mostra só a dica", () => {
    render(
      <AppointmentSheet
        item={{ ...base, canCancel: false, canPay: false, cancelHint: "Cancelamento pelo app só até 2h antes." }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /cancelar agendamento/i })).not.toBeInTheDocument();
    expect(screen.getByText(/só até 2h antes/)).toBeInTheDocument();
  });

  it("concluído sem avaliação: estrelas e 'Agendar de novo' pré-selecionado", () => {
    render(
      <AppointmentSheet
        item={{ ...base, status: "completed", paymentStatus: "paid", canCancel: false, canPay: false, canReview: true }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: /nota/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /agendar de novo/i })).toHaveAttribute(
      "href",
      "/agendar?barbeiro=b1&servico=svc-corte",
    );
    expect(screen.queryByRole("link", { name: /pix/i })).not.toBeInTheDocument();
  });
});
