"use client";

import { useRecipes } from "@/lib/recipes-context";

/**
 * Renders the loading/error state for the recipes-from-repository fetch.
 * Used anywhere a page would otherwise show a bare "Loading…" string with no
 * way to tell a slow load apart from a genuinely stuck one.
 */
export function RecipeLoadStatus({ label }: { label: string }) {
  const { loadError, loadIsSlow } = useRecipes();

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        <p className="font-semibold">Couldn&rsquo;t load your recipes.</p>
        <p className="mt-1">{loadError}</p>
        <p className="mt-2 text-red-700 dark:text-red-400">
          Open the browser console for the full error and a log of what was loaded.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-stone-500 dark:text-stone-400">{label}</p>
      {loadIsSlow && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-semibold">This is taking much longer than it should.</p>
          <p className="mt-1">
            A local recipe read should be instant, so this usually means the page is running stale
            JavaScript — most often an old service worker still controlling this tab. Check the
            browser console (logs are prefixed <code>[cookbook]</code>) and DevTools → Application/Storage
            → Service Workers.
          </p>
        </div>
      )}
    </div>
  );
}
