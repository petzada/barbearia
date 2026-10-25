// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CalendarOff } from "lucide-react";
import { EmptyState } from "./page-header";

describe("EmptyState", () => {
  it("mostra título, descrição e a próxima ação", () => {
    render(
      <EmptyState
        icon={CalendarOff}
        title="Nenhum bloqueio marcado"
        description="Bloqueie o almoço ou uma folga."
        action={<button type="button">Bloquear horário</button>}
      />,
    );
    expect(screen.getByText("Nenhum bloqueio marcado")).toBeInTheDocument();
    expect(screen.getByText("Bloqueie o almoço ou uma folga.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bloquear horário" })).toBeInTheDocument();
  });

  it("variante compacta dispensa a ação", () => {
    render(<EmptyState compact title="Dia lotado" />);
    expect(screen.getByText("Dia lotado")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
