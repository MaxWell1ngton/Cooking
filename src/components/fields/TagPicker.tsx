"use client";

import { useState, type KeyboardEvent } from "react";

interface TagPickerProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  /** Quick-pick suggestions shown as toggle buttons — not an exhaustive list, just shortcuts for common ones. */
  presets: readonly string[];
}

const pillClass =
  "flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200";

const presetButtonClass =
  "rounded-full border px-3 py-1 text-sm font-medium transition";

/** Add/remove tags: click a preset to toggle it, or type a custom one — same "small removable chips" pattern as ingredient groups. */
export function TagPicker({ tags, onChange, presets }: TagPickerProps) {
  const [draft, setDraft] = useState("");

  const hasTag = (value: string) => tags.some((tag) => tag.toLowerCase() === value.toLowerCase());

  const addTag = (raw: string) => {
    const value = raw.trim();
    if (!value || hasTag(value)) {
      setDraft("");
      return;
    }
    onChange([...tags, value]);
    setDraft("");
  };

  const removeTag = (value: string) => onChange(tags.filter((tag) => tag !== value));

  const togglePreset = (preset: string) => {
    if (hasTag(preset)) onChange(tags.filter((tag) => tag.toLowerCase() !== preset.toLowerCase()));
    else onChange([...tags, preset]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag(draft);
    }
  };

  return (
    <div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className={pillClass}>
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`Remove tag ${tag}`}
                className="text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-100"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div className={`flex flex-wrap gap-2 ${tags.length > 0 ? "mt-3" : ""}`}>
        {presets.map((preset) => {
          const active = hasTag(preset);
          return (
            <button
              key={preset}
              type="button"
              onClick={() => togglePreset(preset)}
              aria-pressed={active}
              className={`${presetButtonClass} ${
                active
                  ? "border-amber-600 bg-amber-600 text-white"
                  : "border-stone-300 bg-white text-stone-600 hover:border-amber-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
              }`}
            >
              {preset}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a custom tag"
          aria-label="Add a custom tag"
          className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
        />
        <button
          type="button"
          onClick={() => addTag(draft)}
          disabled={!draft.trim()}
          aria-label="Add tag"
          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          Add
        </button>
      </div>
    </div>
  );
}
