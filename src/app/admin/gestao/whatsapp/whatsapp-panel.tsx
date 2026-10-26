"use client";

/* eslint-disable @next/next/no-img-element -- QR Code chega como data URL da WhatsMiau. */
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, History, RefreshCw, Send, Unplug, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  whatsappCreateInstanceAction,
  whatsappDeleteInstanceAction,
  whatsappRefreshQrAction,
  whatsappSaveRemindersAction,
  whatsappSyncAction,
  whatsappTestAction,
} from "@/app/actions/admin";
import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { SettingsGroup } from "@/components/kit/settings-list";
import { EmptyState } from "@/components/page-header";
import { TemplateEditor, WhatsappBubblePreview } from "@/components/kit/template-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_WHATSAPP_TEMPLATE } from "@/server/whatsapp/template";
import { formatBrazilPhone, maskBrazilPhoneInput } from "@/lib/phone";
import { formatDayLabel } from "@/lib/agenda/format";
import { chipClass, chipRowClass } from "@/lib/ui/classes";
import { cn } from "@/lib/utils";

type Config = {
  status: "not_configured" | "connecting" | "connected" | "disconnected" | "qr_required" | "unknown";
  instanceName: string | null;
  phoneConnected: string | null;
  qrCode: string | null;
  lastSyncAt: number | null;
  remindersEnabled: boolean;
  reminderTemplate: string | null;
  reminderHour: number;
};

type Log = { id: string; kind: string; status: string; toPhone: string; message: string | null; error: string | null; createdAt: number };

const STATUS: Record<Config["status"], { label: string; tone: string }> = {
  connected: { label: "Conectado", tone: "text-success-ink" },
  connecting: { label: "Conectando…", tone: "text-warning-ink" },
  qr_required: { label: "Escaneie o QR Code", tone: "text-warning-ink" },
  disconnected: { label: "Desconectado", tone: "text-destructive" },
  not_configured: { label: "Não configurado", tone: "text-destructive" },
  unknown: { label: "Status desconhecido", tone: "text-warning-ink" },
};

const KIND_LABELS: Record<string, string> = { otp: "Código", reminder: "Lembrete", test: "Teste", invite: "Convite", billing: "Cobrança" };
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6);
const QR_REFRESH_MS = 20_000;
const SYNC_MS = 8_000;

export function WhatsappPanel({
  apiConfigured,
  config,
  shop,
  logs,
  kind,
}: {
  apiConfigured: boolean;
  config: Config;
  shop: { name: string; phone: string | null; address: string | null };
  logs: Log[];
  kind?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(config.remindersEnabled);
  const [hour, setHour] = useState(config.reminderHour);
  const [template, setTemplate] = useState(config.reminderTemplate ?? DEFAULT_WHATSAPP_TEMPLATE);
  const [testPhone, setTestPhone] = useState("");
  const waiting = config.status === "qr_required" || config.status === "connecting";

  // Enquanto espera o pareamento: confere o status e renova o QR sozinho.
  useEffect(() => {
    if (!waiting) return;
    const sync = setInterval(async () => {
      const r = await whatsappSyncAction();
      if (r.ok && r.data.status !== config.status) router.refresh();
    }, SYNC_MS);
    const qr = setInterval(async () => {
      await whatsappRefreshQrAction();
      router.refresh();
    }, QR_REFRESH_MS);
    return () => {
      clearInterval(sync);
      clearInterval(qr);
    };
  }, [waiting, config.status, router]);

  function run(fn: () => Promise<{ ok: boolean; error: string | null }>, message?: string) {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      if (message) toast.success(message);
      router.refresh();
    });
  }

  async function disconnect() {
    const r = await whatsappDeleteInstanceAction();
    if (!r.ok) {
      toast.error(r.error);
      return false;
    }
    toast.success("WhatsApp desconectado.");
    router.refresh();
  }

  const status = STATUS[config.status];
  const dirty =
    enabled !== config.remindersEnabled ||
    hour !== config.reminderHour ||
    template.trim() !== (config.reminderTemplate ?? DEFAULT_WHATSAPP_TEMPLATE).trim();

  return (
    <>
      <section className="flex flex-col gap-4 rounded-lg bg-card p-5 shadow-card" aria-label="Conexão">
        <div className="flex items-center gap-3">
          {config.status === "connected" ? (
            <CheckCircle2 className="size-8 shrink-0 text-success-ink" aria-hidden />
          ) : (
            <XCircle className={cn("size-8 shrink-0", status.tone)} aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className={cn("text-lg font-extrabold", status.tone)}>{status.label}</p>
            <p className="truncate text-sm text-ink-subtle">
              {config.phoneConnected ? formatBrazilPhone(config.phoneConnected) : config.instanceName ?? "WhatsApp da barbearia"}
            </p>
          </div>
        </div>

        {config.status !== "connected" && (
          <p className="flex items-start gap-2 rounded-md bg-warning/12 p-3 text-sm font-semibold text-warning-ink">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            Sem conexão, o login por código e os lembretes param. A equipe ainda entra pelo Google.
          </p>
        )}

        {!apiConfigured ? (
          <p className="text-sm text-ink-subtle">Configure a chave WHATSMIAU_API_KEY no Cloudflare para conectar.</p>
        ) : config.status === "not_configured" ? (
          <Button size="lg" disabled={pending} onClick={() => run(() => whatsappCreateInstanceAction(), "Instância criada. Escaneie o QR Code.")}>
            Conectar WhatsApp
          </Button>
        ) : (
          <>
            {waiting && config.qrCode && (
              <div className="flex flex-col items-center gap-3">
                <img src={config.qrCode} alt="QR Code para conectar o WhatsApp" className="size-60 rounded-md bg-qr-surface p-2" />
                <p className="text-center text-sm text-ink-subtle">
                  No celular da barbearia: WhatsApp › Aparelhos conectados › Conectar aparelho. O código se renova sozinho.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" disabled={pending} onClick={() => run(() => whatsappSyncAction(), "Status atualizado.")}>
                <RefreshCw aria-hidden />
                Sincronizar
              </Button>
              {config.status !== "connected" && (
                <Button disabled={pending} onClick={() => run(() => whatsappRefreshQrAction(), "Novo QR Code gerado.")}>
                  Novo QR Code
                </Button>
              )}
            </div>
            {config.status === "connected" && (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" className="text-destructive" disabled={pending}>
                    <Unplug aria-hidden />
                    Desconectar WhatsApp
                  </Button>
                }
                title="Desconectar o WhatsApp?"
                description="O login por código e os lembretes param até você conectar de novo."
                confirmLabel="Desconectar"
                onConfirm={disconnect}
              />
            )}
          </>
        )}
      </section>

      <SettingsGroup title="Lembretes">
        <label className="flex items-center justify-between gap-3 px-4 py-3">
          <span>
            <span className="block font-semibold">Lembrete no dia do horário</span>
            <span className="text-xs text-ink-subtle">Enviado para quem tem agendamento no dia</span>
          </span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </label>
        <div className="flex flex-col gap-2 px-4 py-3">
          <span className="text-sm font-semibold">Horário do envio</span>
          <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1">
            {HOURS.map((h) => (
              <button key={h} type="button" aria-pressed={hour === h} onClick={() => setHour(h)} className={cn("tabular shrink-0 px-3", chipClass)}>
                {String(h).padStart(2, "0")}h
              </button>
            ))}
          </div>
        </div>
      </SettingsGroup>

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-ink-subtle">Mensagem</h2>
        <TemplateEditor value={template} onChange={setTemplate} />
        <WhatsappBubblePreview
          template={template}
          context={{
            cliente_nome: "João",
            profissional_nome: "Moura",
            servico_nome: "Corte",
            data_agendamento: formatDayLabel("2026-11-02"),
            hora_agendamento: "15:00",
            barbearia_nome: shop.name,
            telefone_barbearia: shop.phone ? formatBrazilPhone(shop.phone) : "",
            endereco_barbearia: shop.address ?? "",
          }}
        />
        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={pending || !dirty}
            onClick={() =>
              run(
                () =>
                  whatsappSaveRemindersAction({
                    remindersEnabled: enabled,
                    reminderHour: hour,
                    reminderTemplate: template.trim() === DEFAULT_WHATSAPP_TEMPLATE ? null : template,
                  }),
                "Lembretes salvos.",
              )
            }
          >
            {pending ? "Salvando…" : "Salvar"}
          </Button>
          <Button variant="outline" disabled={pending} onClick={() => setTemplate(DEFAULT_WHATSAPP_TEMPLATE)}>
            Restaurar padrão
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-ink-subtle">Teste</h2>
        <div className="flex gap-2">
          <Input type="tel" inputMode="tel" placeholder="(11) 98765-4321" aria-label="WhatsApp para teste" value={testPhone} onChange={(e) => setTestPhone(maskBrazilPhoneInput(e.target.value))} />
          <Button disabled={pending || testPhone.replace(/\D/g, "").length < 10 || config.status !== "connected"} onClick={() => run(() => whatsappTestAction(testPhone), "Mensagem de teste enviada.")}>
            <Send aria-hidden />
            Enviar
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-ink-subtle">Histórico</h2>
        <nav className={chipRowClass} aria-label="Filtrar histórico">
          {[{ key: undefined, label: "Todos" }, ...Object.entries(KIND_LABELS).map(([key, label]) => ({ key, label }))].map((f) => (
            <Link
              key={f.label}
              href={f.key ? `/admin/gestao/whatsapp?tipo=${f.key}` : "/admin/gestao/whatsapp"}
              aria-current={kind === f.key ? "true" : undefined}
              className={cn("shrink-0 px-4", chipClass)}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        {logs.length === 0 ? (
          <EmptyState compact icon={History} title="Nenhum envio registrado" />
        ) : (
          <ul className="divide-y divide-hairline rounded-lg bg-card shadow-card">
            {logs.map((l) => (
              <li key={l.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                {l.status === "sent" ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success-ink" aria-label="Enviado" />
                ) : l.status === "skipped" ? (
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-ink-tertiary" aria-label="Ignorado" />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Falhou" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {KIND_LABELS[l.kind] ?? l.kind} · {formatBrazilPhone(l.toPhone)}
                  </p>
                  <p className="truncate text-ink-subtle">{l.error ? `Falha: ${l.error}` : l.message}</p>
                </div>
                <span className="tabular shrink-0 text-xs text-ink-subtle">
                  {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(l.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
