// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MultiAgenda, type AgendaColumn } from "./multi-agenda";

const at = (hhmm: string) => new Date(`2030-01-07T${hhmm}:00-03:00`).toISOString();
const entry = (id: string, start: string, end: string, extra: Partial<AgendaColumn["entries"][number]> = {}) => ({
  id,
  type: "appointment" as const,
  starts_at: at(start),
  ends_at: at(end),
  status: "booked",
  note: null,
  clientName: `Cliente ${id}`,
  clientPhone: null,
  serviceName: "Corte",
  barberName: "",
  priceCents: 4500,
  paymentMethod: "local",
  paymentStatus: "unpaid",
  ...extra,
});

const columns: AgendaColumn[] = [
  { barber: { id: "m", name: "Moura" }, dayBounds: { openTime: "09:00", closeTime: "12:00", isClosed: false }, entries: [entry("a", "09:00", "09:30")] },
  {
    barber: { id: "l", name: "Léo" },
    dayBounds: { openTime: "10:00", closeTime: "12:00", isClosed: false },
    entries: [entry("b", "10:00", "11:00"), entry("c", "11:00", "11:30", { type: "block", note: "Almoço", clientName: "" })],
  },
  { barber: { id: "d", name: "Davi" }, dayBounds: { openTime: "09:00", closeTime: "19:00", isClosed: true }, entries: [] },
];

describe("MultiAgenda (colunas por barbeiro)", () => {
  it("mostra uma coluna por barbeiro com expediente e folga", () => {
    render(<MultiAgenda dateKey="2030-01-07" columns={columns} onSelect={() => {}} onAddAt={() => {}} />);
    const header = screen.getByText("Moura").parentElement!.parentElement!;
    expect(within(header).getByText("09:00 – 12:00")).toBeInTheDocument();
    expect(within(header).getByText("Folga ou fechado")).toBeInTheDocument();
    expect(screen.getByText("Cliente a")).toBeInTheDocument();
    expect(screen.getByText("Bloqueio")).toBeInTheDocument();
  });

  it("tocar num atendimento seleciona; tocar no vazio abre encaixe naquele barbeiro e horário", () => {
    const onSelect = vi.fn();
    const onAddAt = vi.fn();
    render(<MultiAgenda dateKey="2030-01-07" columns={columns} onSelect={onSelect} onAddAt={onAddAt} />);
    fireEvent.click(screen.getByText("Cliente b"));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "b" }));
    fireEvent.click(screen.getByRole("button", { name: "Encaixe ou bloqueio às 10:30 com Moura" }));
    expect(onAddAt).toHaveBeenCalledWith("m", "10:30");
  });
});
