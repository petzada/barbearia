import { describe, expect, it } from "vitest";
import { DEFAULT_WHATSAPP_TEMPLATE, renderWhatsappTemplate } from "./template";


describe("renderWhatsappTemplate", () => {
  it("replaces known variables", () => {
    const output = renderWhatsappTemplate(
      "Ola {{cliente_nome}}, seu horario e {{hora_agendamento}}.",
      {
        cliente_nome: "Carlos",
        hora_agendamento: "09:30",
      }
    );

    expect(output).toBe("Ola Carlos, seu horario e 09:30.");
  });

  it("removes unknown variables as empty", () => {
    const output = renderWhatsappTemplate("Teste {{variavel_inexistente}}", {
      cliente_nome: "Ana",
    });

    expect(output).toBe("Teste");
  });

  it("uses default template when body is empty", () => {
    const output = renderWhatsappTemplate("", {
      cliente_nome: "Ana",
      profissional_nome: "Joao",
      servico_nome: "Corte",
      data_agendamento: "25/03/2026",
      hora_agendamento: "10:00",
      barbearia_nome: "Barbearia do Moura",
      telefone_barbearia: "5511999999999",
      endereco_barbearia: "Rua A, 123",
    });

    expect(output).toContain("Ana");
    expect(output).not.toBe(DEFAULT_WHATSAPP_TEMPLATE);
  });
});
