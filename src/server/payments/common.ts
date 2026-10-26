import type { PlanCycle } from "../db/schema";
import { DomainError } from "../errors";
import type { ServerEnv } from "../env";
import { AbacatePayClient, type PaymentGateway } from "./abacatepay";

export function createPaymentGateway(env: ServerEnv): PaymentGateway | null {
  return env.abacatePayApiKey ? new AbacatePayClient(env.abacatePayApiKey) : null;
}

export function requireGateway(gateway: PaymentGateway | null): PaymentGateway {
  if (!gateway) {
    throw new DomainError(
      "provider",
      "Pagamento online indisponível no momento. Você pode pagar na barbearia.",
    );
  }
  return gateway;
}

export function addCycle(from: Date, cycle: PlanCycle): Date {
  const d = new Date(from.getTime());
  switch (cycle) {
    case "WEEKLY":
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case "MONTHLY":
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
    case "QUARTERLY":
      d.setUTCMonth(d.getUTCMonth() + 3);
      break;
    case "SEMIANNUALLY":
      d.setUTCMonth(d.getUTCMonth() + 6);
      break;
    case "ANNUALLY":
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
  }
  return d;
}
