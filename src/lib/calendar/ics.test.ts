import { describe, expect, it } from "vitest";
import { buildIcsEvent, escapeIcsText, toIcsUtc } from "./ics";

describe("ICS (Adicionar à agenda)", () => {
  it("formata datas em UTC", () => {
    expect(toIcsUtc(new Date("2026-11-02T18:05:09Z"))).toBe("20261102T180509Z");
  });

  it("escapa caracteres especiais", () => {
    expect(escapeIcsText("Corte, barba; ok\\fim\nlinha")).toBe("Corte\\, barba\; ok\\\\fim\\nlinha");
  });

  it("gera um VEVENT completo com alarme de 1h e CRLF", () => {
    const ics = buildIcsEvent({
      uid: "entry-1",
      start: new Date("2026-11-02T18:00:00Z"),
      end: new Date("2026-11-02T18:30:00Z"),
      summary: "Corte com Moura",
      description: "Barbearia do Moura",
      location: "Rua X, 10, Mauá/SP",
      createdAt: new Date("2026-11-01T12:00:00Z"),
    });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("UID:entry-1@barbeariadomoura.app\r\n");
    expect(ics).toContain("DTSTART:20261102T180000Z\r\n");
    expect(ics).toContain("DTEND:20261102T183000Z\r\n");
    expect(ics).toContain("LOCATION:Rua X\\, 10\\, Mauá/SP\r\n");
    expect(ics).toContain("TRIGGER:-PT1H");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("dobra linhas longas em 75 octetos", () => {
    const ics = buildIcsEvent({
      uid: "x",
      start: new Date(0),
      end: new Date(60_000),
      summary: "Á".repeat(80),
    });
    const summary = ics.split("\r\n").filter((l) => l.startsWith("SUMMARY") || l.startsWith(" "));
    for (const line of summary) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(summary.length).toBeGreaterThan(1);
  });
});
