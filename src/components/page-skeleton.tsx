import { Skeleton } from "@/components/ui/skeleton";

type Variant = "list" | "grid" | "dashboard" | "settings";

/**
 * Esqueleto no formato de cada tipo de tela: título grande + o corpo típico
 * (lista de cards, grade de opções, indicadores ou grupos de linhas).
 */
export function PageSkeleton({
  variant = "list",
  cards = 3,
  withTabs = false,
}: {
  variant?: Variant;
  cards?: number;
  withTabs?: boolean;
}) {
  return (
    <div aria-busy="true" aria-label="Carregando" className="flex flex-col gap-6 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] lg:px-0 lg:pt-10">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>
      {withTabs && <Skeleton className="h-[52px] w-full rounded-lg" />}
      {variant === "list" && <ListBody cards={cards} />}
      {variant === "grid" && <GridBody cards={cards} />}
      {variant === "dashboard" && <DashboardBody />}
      {variant === "settings" && <SettingsBody groups={cards} />}
    </div>
  );
}

function ListBody({ cards }: { cards: number }) {
  return Array.from({ length: cards }, (_, i) => (
    <div key={i} className="flex items-center gap-4 rounded-lg bg-card p-5 shadow-card">
      <Skeleton className="size-14 shrink-0 rounded-md" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-3/5 rounded" />
        <Skeleton className="h-3 w-2/5 rounded" />
      </div>
    </div>
  ));
}

function GridBody({ cards }: { cards: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-lg bg-card p-4 shadow-card">
          <Skeleton className="aspect-square w-full rounded-md" />
          <Skeleton className="h-4 w-4/5 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}

function DashboardBody() {
  return (
    <>
      <div className="flex flex-col gap-4 rounded-lg bg-card p-5 shadow-card">
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <Skeleton className="h-[52px] w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg bg-card p-4 shadow-card">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-7 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </>
  );
}

function SettingsBody({ groups }: { groups: number }) {
  return Array.from({ length: groups }, (_, g) => (
    <div key={g} className="flex flex-col gap-2">
      <Skeleton className="h-3 w-28 rounded" />
      <div className="divide-y divide-hairline overflow-hidden rounded-lg bg-card shadow-card">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex min-h-14 items-center gap-3 px-4 py-3">
            <Skeleton className="size-9 shrink-0 rounded-md" />
            <Skeleton className="h-4 flex-1 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  ));
}
