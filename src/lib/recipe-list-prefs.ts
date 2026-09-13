export type RecipeSortOption = "dateAdded" | "lastEdited" | "alphabetical";

export interface RecipeListPrefs {
  sort: RecipeSortOption;
  tag: string; // "" means "all tags"
}

const STORAGE_KEY = "cookbook.recipeListPrefs.v1";

const DEFAULT_PREFS: RecipeListPrefs = { sort: "lastEdited", tag: "" };

/**
 * A view preference (sort/filter choice), not recipe data — kept in
 * localStorage rather than the repository so it's per-device and never
 * touches the backup/export format.
 */
export function loadRecipeListPrefs(): RecipeListPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      sort: parsed?.sort === "dateAdded" || parsed?.sort === "alphabetical" || parsed?.sort === "lastEdited" ? parsed.sort : DEFAULT_PREFS.sort,
      // Falls back to "" (all tags) for prefs saved before the category->tags
      // rename, rather than crashing on the old shape.
      tag: typeof parsed?.tag === "string" ? parsed.tag : DEFAULT_PREFS.tag,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveRecipeListPrefs(prefs: RecipeListPrefs): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
