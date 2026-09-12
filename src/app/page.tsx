"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRecipes } from "@/lib/recipes-context";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeLoadStatus } from "@/components/RecipeLoadStatus";

export default function HomePage() {
  const { recipes, isLoading, loadError } = useRecipes();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((recipe) => {
      if (recipe.title.toLowerCase().includes(q)) return true;
      return recipe.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(q));
    });
  }, [recipes, query]);

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
    <div className="space-y-4">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search recipes or ingredients…"
        aria-label="Search recipes"
        className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
      />
      {filtered.length === 0 ? (
        <p className="text-stone-500 dark:text-stone-400">No recipes match &ldquo;{query}&rdquo;.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
