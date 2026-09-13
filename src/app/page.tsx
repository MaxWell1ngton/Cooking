"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRecipes } from "@/lib/recipes-context";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeLoadStatus } from "@/components/RecipeLoadStatus";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ConfirmDialog";
import { formatRecipeTitle } from "@/lib/format";
import { loadRecipeListPrefs, saveRecipeListPrefs, type RecipeSortOption } from "@/lib/recipe-list-prefs";
import type { Recipe } from "@/types/recipe";

const controlClass =
  "rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";

function sortRecipes(recipes: Recipe[], sort: RecipeSortOption): Recipe[] {
  const sorted = [...recipes];
  if (sort === "dateAdded") {
    sorted.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  } else if (sort === "alphabetical") {
    sorted.sort((a, b) => formatRecipeTitle(a.title).localeCompare(formatRecipeTitle(b.title), undefined, { sensitivity: "base" }));
  } else {
    sorted.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  }
  return sorted;
}

export default function HomePage() {
  const { recipes, isLoading, loadError, deleteRecipe } = useRecipes();
  const [query, setQuery] = useState("");
  // Sort/filter are a view preference, not recipe data — read once from
  // localStorage as the initial state (safe during a build-time prerender,
  // since loadRecipeListPrefs() guards for no `window`) rather than an
  // effect, so there's no separate "has this loaded yet" state to track.
  const [sort, setSort] = useState<RecipeSortOption>(() => loadRecipeListPrefs().sort);
  const [tagFilter, setTagFilter] = useState(() => loadRecipeListPrefs().tag);

  // No separate "selection mode" flag to keep in sync — it's just whether
  // anything is selected, so deselecting the last card naturally exits it.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectionMode = selectedIds.size > 0;
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteDialogRef = useRef<ConfirmDialogHandle>(null);

  useEffect(() => {
    saveRecipeListPrefs({ sort, tag: tagFilter });
  }, [sort, tagFilter]);

  // Filter options are every tag actually in use, not just the form's preset
  // list — so a custom tag someone added is still filterable.
  const availableTags = useMemo(() => {
    const seen = new Set<string>();
    for (const recipe of recipes) {
      for (const tag of recipe.tags ?? []) seen.add(tag);
    }
    return [...seen].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [recipes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = recipes;
    if (tagFilter) list = list.filter((recipe) => recipe.tags?.includes(tagFilter));
    if (q) {
      list = list.filter((recipe) => {
        if (recipe.title.toLowerCase().includes(q)) return true;
        return recipe.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(q));
      });
    }
    return sortRecipes(list, sort);
  }, [recipes, query, tagFilter, sort]);

  const enterSelection = (id: string) => setSelectedIds(new Set([id]));

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cancelSelection = () => setSelectedIds(new Set());

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    try {
      await Promise.all([...selectedIds].map((id) => deleteRecipe(id)));
    } finally {
      setIsDeleting(false);
      cancelSelection();
    }
  };

  if (isLoading || loadError) {
    return <RecipeLoadStatus label="Loading recipes…" />;
  }

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-stone-300 px-6 py-16 text-center dark:border-stone-700">
        <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-100">
          No recipes yet
        </h1>
        <p className="max-w-sm text-stone-500 dark:text-stone-400">
          Save your first recipe to start building your personal cookbook.
        </p>
        <Link
          href="/recipe/new/"
          className="rounded-full bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800"
        >
          Add your first recipe
        </Link>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${selectionMode ? "pb-20" : ""}`}>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search recipes or ingredients…"
        aria-label="Search recipes"
        className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
      />

      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
          Sort
          <select
            aria-label="Sort recipes"
            value={sort}
            onChange={(event) => setSort(event.target.value as RecipeSortOption)}
            className={controlClass}
          >
            <option value="lastEdited">Last edited</option>
            <option value="dateAdded">Date added</option>
            <option value="alphabetical">Alphabetical (A-Z)</option>
          </select>
        </label>
        {availableTags.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
            Tag
            <select
              aria-label="Filter by tag"
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
              className={controlClass}
            >
              <option value="">All tags</option>
              {availableTags.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-stone-500 dark:text-stone-400">
          {query ? <>No recipes match &ldquo;{query}&rdquo;.</> : "No recipes match this filter."}
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard
                recipe={recipe}
                selectionMode={selectionMode}
                selected={selectedIds.has(recipe.id)}
                onEnterSelection={enterSelection}
                onToggleSelection={toggleSelection}
              />
            </li>
          ))}
        </ul>
      )}

      {selectionMode && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 sm:px-2">
            <button
              type="button"
              onClick={cancelSelection}
              className="rounded-full px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
            <span className="text-sm text-stone-500 dark:text-stone-400">{selectedIds.size} selected</span>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => deleteDialogRef.current?.open()}
              className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              Delete selected ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        ref={deleteDialogRef}
        title={`Delete ${selectedIds.size} recipe${selectedIds.size === 1 ? "" : "s"}?`}
        description="This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleDeleteSelected()}
      />
    </div>
  );
}
