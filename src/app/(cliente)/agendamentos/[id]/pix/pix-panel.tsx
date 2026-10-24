"use client";

/* eslint-disable @next/next/no-img-element -- QR Code chega como data URL do AbacatePay. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { checkPixAction, simulatePixAction } from "@/app/actions/cliente";
import { Button, buttonVariants } from "@/components/ui/button";

const POLL_MS = 4000;

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function PixPanel({
  paymentId,
  brCode,
  qrImage,
  expiresAt,
  devMode,
}: {
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
    if (status !== "pending") return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(async () => {
      const result = await checkPixAction(paymentId);
      if (result.ok && result.data.status !== "pending") {
        setStatus(result.data.status);
        router.refresh();
      }
    }, POLL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [paymentId, status, router]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(brCode);
      toast.success("Código Pix copiado!");
    } catch {
      toast.error("Não deu para copiar. Selecione o código manualmente.");
    }
  }

  async function simulate() {
    setSimulating(true);
    const result = await simulatePixAction(paymentId);
    setSimulating(false);
    if (!result.ok) return void toast.error(result.error);
    setStatus(result.data.status);
  }

  if (status === "paid") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg bg-card p-8 text-center shadow-card">
        <CheckCircle2 className="size-14 text-success" aria-hidden />
        <p className="text-xl font-extrabold">Pagamento confirmado!</p>
        <p className="text-sm text-ink-subtle">Tudo certo. É só chegar no horário.</p>
        <Link href="/agendamentos" className={buttonVariants({ className: "mt-2" })}>
          Ver meus agendamentos
        </Link>
      </div>
    );
  }

  if (status === "expired" || status === "cancelled") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg bg-card p-8 text-center shadow-card">
        <p className="text-lg font-bold">Este Pix expirou</p>
        <p className="text-sm text-ink-subtle">Seu horário segue marcado; pague na barbearia ou gere um novo Pix.</p>
        <Button onClick={() => router.refresh()}>Gerar novo Pix</Button>
      </div>
    );
  }

  const remaining = expiresAt ? expiresAt - now : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-4 rounded-lg bg-card p-6 shadow-card">
        {qrImage && (
          <img src={qrImage} alt="QR Code do Pix" className="size-56 rounded-md bg-white p-2" />
        )}
        <p className="text-center text-sm text-ink-subtle">
          Abra o app do seu banco, escolha <strong className="text-ink">Pix &gt; Ler QR Code</strong> ou use o copia e cola.
        </p>
        {remaining != null && (
          <p className="tabular text-sm font-bold text-cta" aria-live="polite">
            Expira em {formatRemaining(remaining)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="brcode" className="text-sm font-bold">
          Pix copia e cola
        </label>
        <textarea
          id="brcode"
          readOnly
          value={brCode}
          rows={3}
          className="w-full resize-none rounded-md bg-card p-3 font-mono text-xs text-ink-muted shadow-card outline-none"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button onClick={copy}>
          <Copy aria-hidden />
          Copiar código
        </Button>
      </div>

      <p className="flex items-center justify-center gap-2 text-sm text-ink-subtle" aria-live="polite">
        <span className="size-2 animate-pulse rounded-full bg-cta" aria-hidden />
        Aguardando pagamento… a confirmação é automática.
      </p>

      {devMode && (
        <Button variant="outline" onClick={simulate} disabled={simulating}>
          <FlaskConical aria-hidden />
          {simulating ? "Simulando…" : "Simular pagamento (modo de teste)"}
        </Button>
      )}
    </div>
  );
}
