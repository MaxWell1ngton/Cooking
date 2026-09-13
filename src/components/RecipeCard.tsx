"use client";

import Link from "next/link";
import { useRef, type MouseEvent, type PointerEvent } from "react";
import type { Recipe } from "@/types/recipe";
import { RecipeImage } from "@/components/RecipeImage";
import { formatRecipeTitle } from "@/lib/format";

const LONG_PRESS_MS = 500;

interface RecipeCardProps {
  recipe: Recipe;
  selectionMode: boolean;
  selected: boolean;
  onEnterSelection: (id: string) => void;
  onToggleSelection: (id: string) => void;
}

export function RecipeCard({ recipe, selectionMode, selected, onEnterSelection, onToggleSelection }: RecipeCardProps) {
  const pressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  const clearPressTimer = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== undefined && event.button !== 0) return; // ignore right/middle click
    longPressFired.current = false;
    pressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      onEnterSelection(recipe.id);
    }, LONG_PRESS_MS);
  };

  const handleClick = (event: MouseEvent) => {
    if (longPressFired.current) {
      event.preventDefault();
      longPressFired.current = false;
      return;
    }
    if (selectionMode) {
      event.preventDefault();
      onToggleSelection(recipe.id);
    }
  };

  return (
    <Link
      href={`/recipe/?id=${recipe.id}`}
      onPointerDown={handlePointerDown}
      onPointerUp={clearPressTimer}
      onPointerLeave={clearPressTimer}
      onPointerCancel={clearPressTimer}
      onContextMenu={(event) => {
        if (selectionMode) event.preventDefault();
      }}
      onClick={handleClick}
      className={`flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm transition select-none hover:shadow-md dark:bg-stone-900 ${
        selected
          ? "border-amber-500 ring-1 ring-amber-500 dark:border-amber-600"
          : "border-stone-200 hover:border-amber-300 dark:border-stone-800 dark:hover:border-amber-700"
      }`}
    >
      {selectionMode && (
        <span
          role="checkbox"
          aria-checked={selected}
          aria-label={selected ? "Selected" : "Not selected"}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
            selected
              ? "border-amber-600 bg-amber-600 text-white"
              : "border-stone-300 bg-white dark:border-stone-600 dark:bg-stone-900"
          }`}
        >
          {selected && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </span>
      )}
      <RecipeImage path={recipe.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0">
        <h2 className="truncate font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
          {formatRecipeTitle(recipe.title)}
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {recipe.ingredients.length} ingredient{recipe.ingredients.length === 1 ? "" : "s"} ·{" "}
          {recipe.steps.length} step{recipe.steps.length === 1 ? "" : "s"}
        </p>
      </div>
    </Link>
  );
}
