"use client";

/* eslint-disable @next/next/no-img-element -- QR Code chega como data URL do AbacatePay. */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { checkPixAction, simulatePixAction } from "@/app/actions/cliente";
import { Button } from "@/components/ui/button";

const POLL_MS = 4000;

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function PixPanel({
  entryId,
  paymentId,
  brCode,
  qrImage,
  expiresAt,
  devMode,
}: {
  entryId: string;
  paymentId: string;
  brCode: string;
  qrImage: string | null;
  expiresAt: number | null;
  devMode: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string>("pending");
  const [now, setNow] = useState(() => Date.now());
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (status === "paid") {
      router.replace(`/agendamentos/${entryId}/confirmado`);
      router.refresh();
    }
  }, [status, entryId, router]);

  useEffect(() => {
    if (status !== "pending") return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(async () => {
      const result = await checkPixAction(paymentId);
      if (result.ok && result.data.status !== "pending") setStatus(result.data.status);
    }, POLL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [paymentId, status]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(brCode);
      toast.success("Código Pix copiado! Agora cole no app do banco.");
    } catch {
      toast.error("Não deu para copiar. Selecione o código abaixo do QR.");
    }
  }

  async function simulate() {
    setSimulating(true);
    const result = await simulatePixAction(paymentId);
    setSimulating(false);
    if (!result.ok) return void toast.error(result.error);
    setStatus(result.data.status);
  }

  if (status === "expired" || status === "cancelled") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg bg-card p-8 text-center shadow-card">
        <p className="text-lg font-bold">Este Pix expirou</p>
        <p className="text-sm text-ink-subtle">Seu horário segue marcado: pague na barbearia ou gere um novo Pix.</p>
        <Button onClick={() => router.refresh()}>Gerar novo Pix</Button>
      </div>
    );
  }

  const remaining = expiresAt ? expiresAt - now : null;

  return (
    <div className="flex flex-col gap-5">
      <Button size="lg" className="w-full" onClick={copy}>
        <Copy aria-hidden />
        Copiar código Pix
      </Button>

      <ol className="flex flex-col gap-2 rounded-lg bg-card p-5 text-[15px] shadow-card">
        {["Abra o app do seu banco", "Escolha Pix › Copia e cola", "Cole o código e confirme"].map((step, i) => (
          <li key={step} className="flex items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-teal-soft text-sm font-bold text-cta-ink">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <p className="flex items-center justify-center gap-2 text-sm font-semibold text-ink-muted" aria-live="polite">
        <span className="size-2 animate-pulse rounded-full bg-cta" aria-hidden />
        Aguardando pagamento… a confirmação é automática.
      </p>

      <details className="group rounded-lg bg-card shadow-card" open>
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-bold">
          Pagar de outro aparelho (QR Code)
        </summary>
        <div className="flex flex-col items-center gap-3 px-5 pb-5">
          {qrImage && <img src={qrImage} alt="QR Code do Pix" className="size-52 rounded-md bg-qr-surface p-2" />}
          <textarea
            readOnly
            aria-label="Código Pix copia e cola"
            value={brCode}
            rows={3}
            className="w-full resize-none rounded-md bg-muted p-3 font-mono text-xs text-ink-muted outline-none"
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      </details>

      {remaining != null && (
        <p className="tabular text-center text-sm font-bold text-cta-ink">Expira em {formatRemaining(remaining)}</p>
      )}

      {devMode && (
        <Button variant="outline" onClick={simulate} disabled={simulating}>
          <FlaskConical aria-hidden />
          {simulating ? "Simulando…" : "Simular pagamento (modo de teste)"}
        </Button>
      )}
    </div>
  );
}
