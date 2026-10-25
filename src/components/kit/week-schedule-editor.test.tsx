// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WeekScheduleEditor, weekFromShop } from "./week-schedule-editor";

const shop = [
  { weekday: 0, openTime: "09:00", closeTime: "19:00", isClosed: true },
  ...[1, 2, 3, 4, 5].map((weekday) => ({ weekday, openTime: "09:00", closeTime: "19:00", isClosed: false })),
  { weekday: 6, openTime: "09:00", closeTime: "13:00", isClosed: false },
];

describe("WeekScheduleEditor", () => {
  it("parte do horário da barbearia e começa na segunda", () => {
    const week = weekFromShop(shop);
    render(<WeekScheduleEditor value={week} onChange={() => {}} disabledDays={[0]} />);
    const names = screen.getAllByText(/^(Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo)$/).map((n) => n.textContent);
    expect(names).toEqual(["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]);
    expect(screen.getByText("Barbearia fechada")).toBeInTheDocument();
    expect(screen.getByLabelText("Fim Sábado")).toHaveValue("13:00");
  });

  it("muda horário e marca folga", () => {
    const onChange = vi.fn();
    const week = weekFromShop(shop);
    render(<WeekScheduleEditor value={week} onChange={onChange} disabledDays={[0]} />);
    fireEvent.change(screen.getByLabelText("Início Terça"), { target: { value: "13:00" } });
    expect(onChange.mock.calls[0][0].find((d: { weekday: number }) => d.weekday === 2)).toMatchObject({ startTime: "13:00" });
    fireEvent.click(screen.getByRole("switch", { name: "Trabalha Quarta" }));
    expect(onChange.mock.calls[1][0].find((d: { weekday: number }) => d.weekday === 3)).toMatchObject({ isOff: true });
  });
});
