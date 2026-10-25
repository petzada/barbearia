"use client";

import { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_WHATSAPP_TEMPLATE,
  renderWhatsappTemplate,
  type WhatsappTemplateContext,
} from "@/server/whatsapp/template";

export const TEMPLATE_VARIABLE_LABELS: { key: keyof WhatsappTemplateContext; label: string }[] = [
  { key: "cliente_nome", label: "Nome do cliente" },
  { key: "hora_agendamento", label: "Horário" },
  { key: "data_agendamento", label: "Data" },
  { key: "profissional_nome", label: "Barbeiro" },
  { key: "servico_nome", label: "Serviço" },
  { key: "barbearia_nome", label: "Barbearia" },
  { key: "telefone_barbearia", label: "Telefone" },
  { key: "endereco_barbearia", label: "Endereço" },
];

/** Editor da mensagem de lembrete: chips inserem variáveis no cursor. */
export function TemplateEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function insert(key: string) {
    const token = `{{${key}}}`;
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        ref={ref}
        aria-label="Mensagem do lembrete"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        maxLength={1000}
        placeholder={DEFAULT_WHATSAPP_TEMPLATE}
      />
      <div className="flex flex-wrap gap-2" aria-label="Inserir variável">
        {TEMPLATE_VARIABLE_LABELS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => insert(v.key)}
            className="h-8 rounded-full bg-teal-soft px-3 text-xs font-bold text-cta transition active:scale-95"
          >
            + {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Prévia em balão de WhatsApp com dados de exemplo. */
export function WhatsappBubblePreview({ template, context }: { template: string; context: WhatsappTemplateContext }) {
  const text = renderWhatsappTemplate(template, context);
  const now = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date());
  return (
    <div className="rounded-lg bg-[#e5ddd5] p-4" aria-label="Prévia da mensagem">
      <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-[#dcf8c6] px-3 pb-1.5 pt-2 text-[15px] leading-snug text-[#111] shadow-sm">
        <p className="whitespace-pre-wrap" data-testid="bubble-text">{text}</p>
        <p className="mt-1 text-right text-[11px] text-[#667781]">{now}</p>
      </div>
    </div>
  );
}
