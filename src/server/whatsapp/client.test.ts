import { describe, expect, it, vi } from "vitest";
import { WhatsmiauClient } from "./client";

describe("WhatsmiauClient.validateWhatsAppNumber", () => {
  it("parses provider payload wrapped as JSON string in response field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            response:
              '[{"exists":true,"jid":"5511960234545@s.whatsapp.net","number":"5511960234545"}]\n',
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      })
    );

    const client = new WhatsmiauClient({
      baseUrl: "https://api.whatsmiau.dev",
      apiKey: "test-key",
    });

    const result = await client.validateWhatsAppNumber(
      "instance-1",
      "5511960234545"
    );

    expect(result.isValid).toBe(true);
    expect(result.normalizedPhone).toBe("5511960234545");
  });
});
