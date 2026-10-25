// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AvailabilityCalendar } from "./availability-calendar";

// Janela de 28/12/2026 a 05/01/2027 (cruza a virada do ano).
const windowKeys = ["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-02", "2027-01-04", "2027-01-05"];

describe("AvailabilityCalendar", () => {
  it("destaca só dias com horário livre e desabilita o resto", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <AvailabilityCalendar
        windowKeys={windowKeys}
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
      <AvailabilityCalendar windowKeys={windowKeys} availableKeys={new Set(["2027-01-04"])} selected={null} onSelect={vi.fn()} />,
    );
    expect(screen.getByText(/dezembro de 2026/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Mês anterior")).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Próximo mês"));
    expect(screen.getByText(/janeiro de 2027/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Próximo mês")).toBeDisabled();
    expect(screen.getByLabelText("4")).not.toBeDisabled();
  });

  it("enquanto carrega nenhum dia é tocável", () => {
    const { container } = render(
      <AvailabilityCalendar windowKeys={windowKeys} availableKeys={null} selected={null} onSelect={vi.fn()} />,
    );
    expect(container.querySelectorAll("[data-available]")).toHaveLength(0);
  });
});
