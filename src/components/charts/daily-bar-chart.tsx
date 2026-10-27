"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPriceCents } from "@/lib/agenda/availability";

export type DailyPoint = {
  dateKey: string;
  valueCents: number;
  /** Divisão opcional do total, listada no tooltip (ex.: origem do dinheiro). */
  parts?: { label: string; valueCents: number }[];
};

const dayLabel = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;
const compactBRL = (cents: number) => {
  const reais = cents / 100;
  return reais >= 1000 ? `${(reais / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : String(Math.round(reais));
};

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const monthLabel = (key: string) => MONTHS[Number(key.slice(5, 7)) - 1] ?? key;

/** Colunas por dia, em reais. */
export function DailyBarChart({ data, label }: { data: DailyPoint[]; label: string }) {
  return (
    <ColumnChart
      data={data.map((d) => ({ key: d.dateKey, value: d.valueCents, parts: d.parts?.map((p) => ({ label: p.label, value: p.valueCents })) }))}
      label={label}
      xLabel={dayLabel}
      formatTick={compactBRL}
      formatValue={formatPriceCents}
    />
  );
}

/** Colunas por mês (`monthKey` = "AAAA-MM"), em contagem. */
export function MonthlyCountChart({ data, label }: { data: { monthKey: string; count: number }[]; label: string }) {
  return (
    <ColumnChart
      data={data.map((d) => ({ key: d.monthKey, value: d.count }))}
      label={label}
      xLabel={monthLabel}
      formatTick={String}
      formatValue={(n) => n.toLocaleString("pt-BR")}
    />
  );
}

type ColumnPoint = { key: string; value: number; parts?: { label: string; value: number }[] };

/**
 * Colunas (série única — sem legenda; o título da seção nomeia).
 * Barras finas (≤ 24px) com topo arredondado de 4px, grade recessiva e
 * tooltip por barra. A tabela/extrato abaixo mantém os valores acessíveis.
 */
function ColumnChart({
  data,
  label,
  xLabel,
  formatTick,
  formatValue,
}: {
  data: ColumnPoint[];
  label: string;
  xLabel: (key: string) => string;
  formatTick: (value: number) => string;
  formatValue: (value: number) => string;
}) {
  return (
    <figure className="flex flex-col gap-2" aria-label={label}>
      <div className="h-44 w-full [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke="var(--hairline)" strokeWidth={1} />
            <XAxis
              dataKey="key"
              tickFormatter={xLabel}
              tickLine={false}
              axisLine={{ stroke: "var(--hairline-strong)" }}
              tick={{ fill: "var(--ink-subtle)", fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              tickFormatter={formatTick}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--ink-subtle)", fontSize: 11 }}
              width={44}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const p = payload[0].payload as ColumnPoint;
                return (
                  <div className="rounded-md bg-ink px-3 py-2 text-on-dark shadow-card">
                    <p className="tabular text-sm font-extrabold">{formatValue(p.value)}</p>
                    <p className="text-xs text-on-dark/70">{xLabel(p.key)}</p>
                    {p.parts && (
                      <ul className="mt-1.5 flex flex-col gap-0.5 border-t border-on-dark/15 pt-1.5">
                        {p.parts.map((part) => (
                          <li key={part.label} className="flex justify-between gap-4 text-xs">
                            <span className="text-on-dark/70">{part.label}</span>
                            <span className="tabular font-bold">{formatValue(part.value)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              }}
            />
            <Bar dataKey="value" fill="var(--chart-1)" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
