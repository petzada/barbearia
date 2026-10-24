import { describe, expect, it } from "vitest";
import {
  mapConnectionStatus,
  parseConnectionUpdateEvent,
} from "./connection";

describe("connection.update parser", () => {
  it("maps open state to connected", () => {
    const parsed = parseConnectionUpdateEvent({
      event: "connection.update",
      instance: "instancia-01",
      data: {
        connection: "open",
        me: {
          id: "5511999999999@s.whatsapp.net",
        },
      },
    });

    expect(parsed.isConnectionUpdate).toBe(true);
    expect(parsed.status).toBe("connected");
    expect(parsed.instanceId).toBe("instancia-01");
    expect(parsed.phoneConnected).toBe("5511999999999");
  });

  it("maps close state to disconnected", () => {
    const parsed = parseConnectionUpdateEvent({
      event: "connection.update",
      data: {
        status: "close",
      },
    });

    expect(parsed.status).toBe("disconnected");
  });

  it("extracts qr base64 payload and infers disconnected status from provider snapshot", () => {
    const parsed = parseConnectionUpdateEvent({
      id: "69b195c785460f175bc12ed3",
      whatsmiau_instance_id: "barbearia-instancia",
      status: "DISCONNECTED",
      base64: "data:image/png;base64,abc123",
    });

    expect(parsed.instanceId).toBe("69b195c785460f175bc12ed3");
    expect(parsed.status).toBe("disconnected");
    expect(parsed.qrCode).toBe("data:image/png;base64,abc123");
  });

  it("extracts nested instance id from payload.instance object", () => {
    const parsed = parseConnectionUpdateEvent({
      data: {
        instance: {
          id: "507f191e810c19729de860ea",
          name: "instancia-02",
        },
      },
    });

    expect(parsed.instanceId).toBe("507f191e810c19729de860ea");
  });

  it("keeps unknown status for unsupported values", () => {
    expect(mapConnectionStatus("custom_status")).toBe("unknown");
  });
});
