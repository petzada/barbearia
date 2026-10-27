"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPriceCents } from "@/lib/agenda/availability";

export type RevenueLinePoint = {
  dateKey: string;
  subscriptionsCents: number;
  onlineCents: number;
  balcaoCents: number;
  commissionsCents: number;
};

type SeriesKey = Exclude<keyof RevenueLinePoint, "dateKey">;

/**
 * Ordem e cores fixas (validadas para daltonismo, todos os pares): a cor segue
 * a série, nunca a posição. Comissões tracejadas — é saída, não faturamento.
 */
const SERIES: { key: SeriesKey; label: string; color: string; dashed?: boolean }[] = [
  { key: "subscriptionsCents", label: "Assinaturas", color: "#008c99" },
  { key: "onlineCents", label: "Avulsos online", color: "#7c4dcc" },
  { key: "balcaoCents", label: "Na barbearia", color: "#b7791f" },
  { key: "commissionsCents", label: "Comissões", color: "#d03d6a", dashed: true },
];

const dayLabel = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;
const compactBRL = (cents: number) => {
  const reais = cents / 100;
  return reais >= 1000 ? `${(reais / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : String(Math.round(reais));
};

function Swatch({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <svg width="16" height="8" aria-hidden className="shrink-0">
      <line x1="1" y1="4" x2="15" y2="4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeDasharray={dashed ? "3 3" : undefined} />
    </svg>
  );
}

/**
 * Linhas por dia: faturamento por origem (assinaturas, avulsos online, balcão)
 * e comissões dos atendimentos concluídos. Legenda sempre visível; o tooltip
 * mostra os quatro valores do dia sob a linha-guia.
 */
export function RevenueLineChart({ data, label }: { data: RevenueLinePoint[]; label: string }) {
  // Poucos dias: pontos visíveis (um dia só vira um ponto por série).
  const showDots = data.length <= 7;
  return (
    <figure className="flex flex-col gap-3 rounded-lg bg-card p-4 shadow-card" aria-label={label}>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-ink-subtle">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <Swatch color={s.color} dashed={s.dashed} />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--hairline)" strokeWidth={1} />
            <XAxis
              dataKey="dateKey"
              tickFormatter={dayLabel}
              tickLine={false}
              axisLine={{ stroke: "var(--hairline-strong)" }}
              tick={{ fill: "var(--ink-subtle)", fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              tickFormatter={compactBRL}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--ink-subtle)", fontSize: 11 }}
              width={44}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: "var(--hairline-strong)", strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const p = payload[0].payload as RevenueLinePoint;
                return (
                  <div className="min-w-44 rounded-md bg-ink px-3 py-2 text-on-dark shadow-card">
                    <p className="mb-1 text-xs text-on-dark/70">{dayLabel(p.dateKey)}</p>
                    <ul className="flex flex-col gap-0.5">
                      {SERIES.map((s) => (
                        <li key={s.key} className="flex items-center gap-2 text-xs">
                          <Swatch color={s.color} dashed={s.dashed} />
                          <span className="flex-1">{s.label}</span>
                          <span className="tabular font-bold">{formatPriceCents(p[s.key])}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }}
            />
            {SERIES.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? "5 4" : undefined}
                dot={showDots ? { r: 4, fill: s.color, stroke: "var(--card)", strokeWidth: 2 } : false}
                activeDot={{ r: 5, fill: s.color, stroke: "var(--card)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
