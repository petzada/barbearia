import { IconDisc } from "@/components/icon-disc";
import { getServiceIcon } from "@/lib/services/icons";
import { cn } from "@/lib/utils";

type Service = { id: string; name: string };

export function ServiceIconStrip({ services }: { services: Service[] }) {
  if (services.length === 0) return null;

  return (
    <div
      className={cn(
        "flex gap-4",
        services.length > 4
          ? "scrollbar-none -mx-5 overflow-x-auto px-5"
          : "justify-between",
      )}
    >
      {services.map((service) => {
        const Icon = getServiceIcon(service.name);
        return (
          <div
            key={service.id}
            className={cn(
              "flex shrink-0 flex-col items-center gap-2",
              services.length > 4 ? "w-[4.5rem]" : "flex-1",
            )}
          >
            <IconDisc>
              <Icon className="size-6" strokeWidth={1.75} />
            </IconDisc>
            <span className="max-w-[4.5rem] truncate text-center text-xs text-ink-subtle">
              {service.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
