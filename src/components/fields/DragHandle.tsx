import type { ButtonHTMLAttributes } from "react";

export function DragHandle(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label="Drag to reorder"
      className="flex h-9 w-9 shrink-0 touch-none items-center justify-center rounded text-stone-400 hover:bg-stone-100 active:cursor-grabbing dark:hover:bg-stone-800"
      style={{ cursor: "grab" }}
      {...props}
    >
      <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">
        <circle cx="2" cy="2" r="1.5" />
        <circle cx="8" cy="2" r="1.5" />
        <circle cx="2" cy="8" r="1.5" />
        <circle cx="8" cy="8" r="1.5" />
        <circle cx="2" cy="14" r="1.5" />
        <circle cx="8" cy="14" r="1.5" />
      </svg>
    </button>
  );
}
