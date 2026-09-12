"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

interface RecipeScalerProps {
  scale: number;
  onChange: (scale: number) => void;
}

const SLIDER_MAX = 500;

function formatPercent(value: number): string {
  // Slider steps are always whole numbers; a typed custom value might not be.
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function RecipeScaler({ scale, onChange }: RecipeScalerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(() => formatPercent(scale));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.select();
  }, [isEditing]);

  const startEditing = () => {
    setDraftValue(formatPercent(scale));
    setIsEditing(true);
  };

  const commit = () => {
    const parsed = Number(draftValue);
    if (Number.isFinite(parsed)) onChange(Math.max(0, parsed));
    setIsEditing(false);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900">
      <label htmlFor="recipe-scale" className="shrink-0 text-sm font-medium text-stone-600 dark:text-stone-400">
        Scale
      </label>
      <input
        id="recipe-scale"
        type="range"
        min={0}
        max={SLIDER_MAX}
        step={5}
        value={Math.min(Math.max(scale, 0), SLIDER_MAX)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="flex-1 accent-amber-700"
      />
      {isEditing ? (
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          step="any"
          autoFocus
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          aria-label="Custom scale percentage"
          className="w-16 shrink-0 rounded-lg border border-amber-600 bg-white px-2 py-1 text-right text-sm font-semibold text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:bg-stone-900 dark:text-stone-100"
        />
      ) : (
        <button
          type="button"
          onClick={startEditing}
          aria-label="Enter a custom scale percentage"
          className="w-16 shrink-0 rounded-lg px-2 py-1 text-right text-sm font-semibold text-stone-900 hover:bg-stone-100 dark:text-stone-100 dark:hover:bg-stone-800"
        >
          {formatPercent(scale)}%
        </button>
      )}
    </div>
  );
}
