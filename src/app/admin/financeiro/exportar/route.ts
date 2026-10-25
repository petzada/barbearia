import { getDb } from "@/server/db";
import { getCurrentUser, toActor } from "@/server/auth";
import { listCommissionLines, listReceipts } from "@/server/finance";
import { paymentMethodLabel } from "@/lib/payments";
import { centsToDecimal, toCsv } from "@/lib/csv";
import { dateKeyFromIsoInSP, formatSlotTime } from "@/lib/agenda/availability";
import { resolvePeriod } from "@/lib/periods";

const fmtDate = (d: Date | null) => (d ? `${dateKeyFromIsoInSP(d).split("-").reverse().join("/")} ${formatSlotTime(d)}` : "");

/** CSV do Financeiro (só gestão): ?tipo=recebimentos|comissoes&periodo=… */
export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current?.isAdmin) return new Response("Não autorizado", { status: 401 });
  const url = new URL(request.url);
  const period = resolvePeriod(url.searchParams.get("periodo") ?? undefined);
  const tipo = url.searchParams.get("tipo") === "comissoes" ? "comissoes" : "recebimentos";
  const db = await getDb();
  const actor = toActor(current);

  const csv =
    tipo === "comissoes"
      ? toCsv(
          ["Data", "Barbeiro", "Cliente", "Serviço", "Preço (R$)", "Comissão (%)", "Comissão (R$)", "Repasse"],
          (await listCommissionLines(db, actor, period)).map((l) => [
            fmtDate(l.startsAt),
            l.barberName,
            l.clientName,
            l.serviceName,
            centsToDecimal(l.priceCents),
            l.commissionPercent,
            centsToDecimal(l.commissionCents),
            l.paid ? "Pago" : "A pagar",
          ]),
        )
      : toCsv(
          ["Data", "Cliente", "Tipo", "Forma", "Valor (R$)"],
          (await listReceipts(db, actor, period)).map((r) => [
            fmtDate(r.paidAt),
            r.clientName,
            r.kind === "subscription" ? "Clube" : "Atendimento",
            paymentMethodLabel(r.method),
            centsToDecimal(r.amountCents),
          ]),
        );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${tipo}-${period.from}_${period.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
