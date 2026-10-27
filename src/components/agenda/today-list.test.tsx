// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TodayList } from "./today-list";

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

describe("TodayList", () => {
  it("uma linha por pendente, em ordem, com início/fim, agora e aguardando conclusão", () => {
    render(
      <TodayList
        entries={[entry("c", "18:00", "18:15"), entry("a", "09:00", "09:30"), entry("b", "13:00", "13:30")]}
        isClosed={false}
        initialNow={new Date(at("13:05")).getTime()}
      />,
    );
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Cliente a");
    expect(items[0]).toHaveTextContent("Aguardando conclusão");
    expect(items[1]).toHaveTextContent("Cliente b");
    expect(items[1]).toHaveTextContent("Agora");
    expect(within(items[2]).getByText("18:00")).toBeInTheDocument();
    expect(within(items[2]).getByText("18:15")).toBeInTheDocument();
    expect(items[2]).toHaveTextContent("Cliente c");
    expect(items[2]).not.toHaveTextContent("Agora");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("sem pendentes mostra o estado vazio", () => {
    render(<TodayList entries={[]} isClosed={false} initialNow={new Date(at("10:00")).getTime()} />);
    expect(screen.getByText("Sem atendimentos pendentes hoje")).toBeInTheDocument();
  });
});
