import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto no formato das telas: título grande + cards. */
export function PageSkeleton({ cards = 3, withTabs = false }: { cards?: number; withTabs?: boolean }) {
  return (
    <div aria-busy="true" aria-label="Carregando" className="flex flex-col gap-6 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] lg:px-0 lg:pt-10">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>
      {withTabs && <Skeleton className="h-12 w-full rounded-lg" />}
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg bg-card p-5 shadow-card">
          <Skeleton className="size-14 shrink-0 rounded-md" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/5 rounded" />
            <Skeleton className="h-3 w-2/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
