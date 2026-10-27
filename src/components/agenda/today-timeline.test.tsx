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

  it("cards encostados (um termina quando o outro começa) não se sobrepõem", () => {
    render(
      <TodayTimeline
        entries={[entry("a", "17:30", "18:00"), entry("b", "18:00", "18:15"), entry("c", "18:15", "18:30")]}
        openTime="09:00"
        closeTime="19:00"
        isClosed={false}
        initialNow={new Date(at("17:00")).getTime()}
      />,
    );
    const boxes = screen.getAllByTestId("today-timeline-card").map((li) => {
      const top = parseFloat(li.style.top);
      return { top, bottom: top + parseFloat(li.style.height), columns: li.dataset.columnCount };
    });
    expect(boxes).toHaveLength(3);
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i - 1].bottom);
    }
    // Sem cruzamento de horário, cada card ocupa a largura toda.
    expect(boxes.map((b) => b.columns)).toEqual(["1", "1", "1"]);
    expect(screen.getByText("Cliente a")).toBeInTheDocument();
    expect(screen.getByText("Cliente b")).toBeInTheDocument();
  });

  it("encaixe no mesmo horário vai para o lado, não por cima", () => {
    render(
      <TodayTimeline
        entries={[entry("a", "10:00", "10:30"), entry("b", "10:00", "10:15")]}
        openTime="09:00"
        closeTime="19:00"
        isClosed={false}
        initialNow={new Date(at("09:00")).getTime()}
      />,
    );
    const cards = screen.getAllByTestId("today-timeline-card").map((li) => [li.dataset.column, li.dataset.columnCount]);
    expect(cards).toEqual([
      ["0", "2"],
      ["1", "2"],
    ]);
  });

  it("a linha do tempo rola dentro de si mesma e abre no agora, sem rolar a página", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(
      <TodayTimeline
        entries={[entry("a", "09:00", "09:30"), entry("b", "14:00", "14:30")]}
        openTime="09:00"
        closeTime="19:00"
        isClosed={false}
        initialNow={new Date(at("13:00")).getTime()}
      />,
    );
    const viewport = screen.getByTestId("today-timeline-scroll");
    expect(viewport.className).toContain("overflow-y-auto");
    expect(viewport.className).toContain("max-h-");
    // 13:00 com início às 9h: 4h × 120px + 12px de padding − 40px de margem.
    expect(viewport.scrollTop).toBe(4 * 120 + 12 - 40);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("estado vazio sem pendentes", () => {
    render(<TodayTimeline entries={[]} openTime="09:00" closeTime="19:00" isClosed={false} initialNow={Date.now()} />);
    expect(screen.getByText("Sem atendimentos pendentes hoje")).toBeInTheDocument();
  });
});
