"use client";

import { useRef, useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Lista reordenável: arraste pela alça (≡) com dedo/mouse, ou foque a alça e
 * use ↑/↓ no teclado. `onCommit` recebe a nova ordem ao soltar.
 */
export function ReorderList<T extends { id: string }>({
  items,
  onCommit,
  renderItem,
  itemLabel,
}: {
  items: T[];
  onCommit: (ids: string[]) => void;
  renderItem: (item: T) => ReactNode;
  itemLabel: (item: T) => string;
}) {
  const [order, setOrder] = useState(items);
  const [dragging, setDragging] = useState<string | null>(null);
  const [lastItems, setLastItems] = useState(items);
  const refs = useRef(new Map<string, HTMLLIElement>());

  // Sincroniza quando o servidor manda uma lista nova.
  if (items !== lastItems) {
    setLastItems(items);
    setOrder(items);
  }

  const commit = (next: T[]) => {
    if (next.map((i) => i.id).join() !== items.map((i) => i.id).join()) onCommit(next.map((i) => i.id));
  };

  function onPointerDown(id: string, event: React.PointerEvent) {
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    setDragging(id);
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!dragging) return;
    const y = event.clientY;
    const from = order.findIndex((i) => i.id === dragging);
    let to = from;
    order.forEach((item, index) => {
      const el = refs.current.get(item.id);
      if (!el || item.id === dragging) return;
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (index < from && y < mid) to = Math.min(to, index);
      if (index > from && y > mid) to = Math.max(to, index);
    });
    if (to !== from) setOrder((current) => moveItem(current, from, to));
  }

  function onPointerUp() {
    if (!dragging) return;
    setDragging(null);
    commit(order);
  }

  function onKeyDown(index: number, event: React.KeyboardEvent) {
    const delta = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = moveItem(order, index, index + delta);
    if (next === order) return;
    setOrder(next);
    commit(next);
    requestAnimationFrame(() => refs.current.get(order[index].id)?.querySelector<HTMLButtonElement>("[data-handle]")?.focus());
  }

  return (
    <ul className="divide-y divide-hairline overflow-hidden rounded-lg bg-card shadow-card" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      {order.map((item, index) => (
        <li
          key={item.id}
          ref={(el) => {
            if (el) refs.current.set(item.id, el);
            else refs.current.delete(item.id);
          }}
          className={cn("flex items-center bg-card", dragging === item.id && "relative z-10 shadow-float")}
        >
          <button
            type="button"
            data-handle
            aria-label={`Reordenar ${itemLabel(item)} (posição ${index + 1} de ${order.length}; use as setas)`}
            onPointerDown={(e) => onPointerDown(item.id, e)}
            onKeyDown={(e) => onKeyDown(index, e)}
            className="flex h-14 w-11 shrink-0 cursor-grab touch-none items-center justify-center text-ink-tertiary active:cursor-grabbing"
          >
            <GripVertical className="size-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">{renderItem(item)}</div>
        </li>
      ))}
    </ul>
  );
}
