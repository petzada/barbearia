// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MonthCalendar } from "./month-calendar";

// Janela de 28/12/2026 a 05/01/2027 (cruza a virada do ano).
const range = { from: "2026-12-28", to: "2027-01-05" };

describe("MonthCalendar", () => {
  it("destaca só dias com horário livre e desabilita o resto", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <MonthCalendar
        range={range}
        availableKeys={new Set(["2026-12-29", "2026-12-31"])}
        selected={null}
        onSelect={onSelect}
      />,
    );
    const day = (key: string) => container.querySelector(`[data-date="${key}"]`) as HTMLButtonElement;
    expect(day("2026-12-29")).not.toBeDisabled();
    expect(day("2026-12-29").dataset.available).toBe("true");
    expect(day("2026-12-30")).toBeDisabled(); // na janela mas sem horários
    expect(day("2026-12-10")).toBeDisabled(); // fora da janela
    fireEvent.click(day("2026-12-31"));
    expect(onSelect).toHaveBeenCalledWith("2026-12-31");
  });

  it("navega só entre os meses da janela, inclusive na virada do ano", () => {
    render(
      <MonthCalendar range={range} availableKeys={new Set(["2027-01-04"])} selected={null} onSelect={vi.fn()} />,
    );
    expect(screen.getByText("Dezembro de 2026")).toBeInTheDocument();
    expect(screen.getByLabelText("Mês anterior")).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Próximo mês"));
    expect(screen.getByText("Janeiro de 2027")).toBeInTheDocument();
    expect(screen.getByLabelText("Próximo mês")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Segunda, 4 de janeiro, com horários" })).not.toBeDisabled();
  });

  it("acessibilidade: grupo de dias com a data completa em cada botão", () => {
    render(
      <MonthCalendar range={range} availableKeys={new Set(["2026-12-29"])} selected={null} onSelect={vi.fn()} />,
    );
    expect(screen.getByRole("group", { name: "Dias de Dezembro de 2026" })).toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Terça, 29 de dezembro, com horários" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Quarta, 30 de dezembro, sem horários" })).toBeDisabled();
  });

  it("enquanto carrega nenhum dia é tocável", () => {
    const { container } = render(
      <MonthCalendar range={range} availableKeys={null} selected={null} onSelect={vi.fn()} />,
    );
    expect(container.querySelectorAll("[data-available]")).toHaveLength(0);
  });
});

describe("MonthCalendar sem filtro de disponibilidade (agenda)", () => {
  it("qualquer dia do mês é tocável e a navegação é livre", () => {
    const onSelect = vi.fn();
    const { container } = render(<MonthCalendar selected="2026-11-02" onSelect={onSelect} />);
    expect(screen.getByText("Novembro de 2026")).toBeInTheDocument();
    const day = container.querySelector('[data-date="2026-11-20"]') as HTMLButtonElement;
    expect(day).not.toBeDisabled();
    fireEvent.click(day);
    expect(onSelect).toHaveBeenCalledWith("2026-11-20");
    expect(screen.getByLabelText("Mês anterior")).not.toBeDisabled();
  });
});
