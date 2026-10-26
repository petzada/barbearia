// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TodayTimeline } from "./today-timeline";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/app/actions/agenda", () => ({
  cancelEntryAction: vi.fn(),
  completeEntryAction: vi.fn(),
  noShowEntryAction: vi.fn(),
  registerLocalPaymentAction: vi.fn(),
  removeBlockAction: vi.fn(),
}));

const at = (hhmm: string) => new Date(`2030-01-07T${hhmm}:00-03:00`).toISOString();
const entry = (id: string, start: string, end: string) => ({
  id,
  type: "appointment" as const,
  starts_at: at(start),
  ends_at: at(end),
  status: "booked",
  note: null,
  clientName: `Cliente ${id}`,
  clientPhone: null,
  serviceName: "Corte",
  barberName: "Moura",
  priceCents: 4500,
  paymentMethod: "local",
  paymentStatus: "unpaid",
});

describe("TodayTimeline", () => {
  Element.prototype.scrollIntoView = vi.fn();

  it("mostra os pendentes no horário, a linha do agora em 24h e marca o atrasado", () => {
    render(
      <TodayTimeline
        entries={[entry("a", "09:00", "09:30"), entry("b", "14:00", "14:30")]}
        openTime="09:00"
        closeTime="19:00"
        isClosed={false}
        initialNow={new Date(at("13:05")).getTime()}
      />,
    );
    expect(screen.getByRole("status", { name: "Agora, 13:05" })).toBeInTheDocument();
    expect(screen.getByText("14h")).toBeInTheDocument();
    expect(screen.getByText("Cliente b")).toBeInTheDocument();
    // 09:00 já passou e não foi concluído.
    expect(screen.getByText("Aguardando conclusão")).toBeInTheDocument();
    expect(screen.getByText("14:00 – 14:30")).toBeInTheDocument();
  });

  it("estado vazio sem pendentes", () => {
    render(<TodayTimeline entries={[]} openTime="09:00" closeTime="19:00" isClosed={false} initialNow={Date.now()} />);
    expect(screen.getByText("Sem atendimentos pendentes hoje")).toBeInTheDocument();
  });
});
