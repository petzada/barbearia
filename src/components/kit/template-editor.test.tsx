// @vitest-environment jsdom
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TemplateEditor, WhatsappBubblePreview } from "./template-editor";

function Harness() {
  const [value, setValue] = useState("Olá! ");
  return (
    <>
      <TemplateEditor value={value} onChange={setValue} />
      <WhatsappBubblePreview template={value} context={{ cliente_nome: "João", hora_agendamento: "15:00" }} />
    </>
  );
}

describe("Editor da mensagem de lembrete", () => {
  it("chips inserem variáveis e a prévia mostra os dados de exemplo", () => {
    render(<Harness />);
    const textarea = screen.getByLabelText("Mensagem do lembrete") as HTMLTextAreaElement;
    textarea.setSelectionRange(5, 5);
    fireEvent.click(screen.getByRole("button", { name: "+ Nome do cliente" }));
    expect(textarea.value).toBe("Olá! {{cliente_nome}}");
    fireEvent.change(textarea, { target: { value: "Olá, {{cliente_nome}}! Às {{hora_agendamento}}." } });
    expect(screen.getByTestId("bubble-text")).toHaveTextContent("Olá, João! Às 15:00.");
  });
});
