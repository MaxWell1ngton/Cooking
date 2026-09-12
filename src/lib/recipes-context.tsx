"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { recipeRepository } from "@/lib/repository";
import type { Recipe, RecipeInput } from "@/types/recipe";

interface RecipesContextValue {
  recipes: Recipe[];
  isLoading: boolean;
  /** Set if the repository promise actually rejected. Null in every other case. */
  loadError: string | null;
  /** True once loading has been in progress for a while without settling either way. */
  loadIsSlow: boolean;
  getRecipe: (id: string) => Recipe | undefined;
  addRecipe: (input: RecipeInput) => Promise<Recipe>;
  editRecipe: (id: string, input: RecipeInput) => Promise<Recipe>;
  deleteRecipe: (id: string) => Promise<void>;
  /** Re-fetches from the repository — for writes that happen outside these methods (e.g. bulk import). */
  refresh: () => Promise<void>;
}

const RecipesContext = createContext<RecipesContextValue | null>(null);

function byUpdatedDesc(a: Recipe, b: Recipe): number {
  return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
}

// How long we wait before assuming the load is stuck rather than just slow.
// A synchronous localStorage read has no legitimate reason to take this long.
const SLOW_LOAD_MS = 4000;

export function RecipesProvider({ children }: { children: ReactNode }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadIsSlow, setLoadIsSlow] = useState(false);
  const activeRef = useRef(true);

  const load = useCallback((isInitialLoad: boolean) => {
    if (isInitialLoad) {
      if ("serviceWorker" in navigator) {
        console.info(
          "[cookbook] service worker controller at load start:",
          navigator.serviceWorker.controller?.scriptURL ?? "(none)",
        );
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          console.info(
            `[cookbook] service worker registrations: ${registrations.length}`,
            registrations.map((r) => ({
              scope: r.scope,
              active: r.active?.scriptURL,
              waiting: r.waiting?.scriptURL,
              installing: r.installing?.scriptURL,
            })),
          );
        });
      }
      console.info("[cookbook] RecipesProvider: calling recipeRepository.list()…");
    }

    const slowTimer = isInitialLoad
      ? setTimeout(() => {
          if (!activeRef.current) return;
          console.warn(
            "[cookbook] RecipesProvider: still waiting on recipeRepository.list() after " +
              `${SLOW_LOAD_MS}ms. A synchronous localStorage read should be near-instant, so this ` +
              "almost always means the page is running stale/broken JavaScript rather than a real " +
              "data problem — check for an active service worker first.",
          );
          setLoadIsSlow(true);
        }, SLOW_LOAD_MS)
      : undefined;

    return recipeRepository
      .list()
      .then((data) => {
        console.info(`[cookbook] RecipesProvider: recipeRepository.list() resolved with ${data.length} recipe(s).`, data);
        return data;
      })
      .catch((error: unknown) => {
        console.error("[cookbook] RecipesProvider: recipeRepository.list() rejected.", error);
        if (activeRef.current && isInitialLoad) setLoadError(error instanceof Error ? error.message : String(error));
        return [] as Recipe[];
      })
      .then((data) => {
        if (slowTimer) clearTimeout(slowTimer);
        if (!activeRef.current) return;
        setRecipes([...data].sort(byUpdatedDesc));
        setIsLoading(false);
        setLoadIsSlow(false);
      });
  }, []);

  useEffect(() => {
    activeRef.current = true;
    void load(true);
    return () => {
      activeRef.current = false;
    };
  }, [load]);

  const refresh = useCallback(() => load(false), [load]);

  const getRecipe = useCallback(
    (id: string) => recipes.find((recipe) => recipe.id === id),
    [recipes],
  );

  const addRecipe = useCallback(async (input: RecipeInput) => {
    const recipe = await recipeRepository.create(input);
    setRecipes((prev) => [recipe, ...prev].sort(byUpdatedDesc));
    return recipe;
  }, []);

  const editRecipe = useCallback(async (id: string, input: RecipeInput) => {
    const recipe = await recipeRepository.update(id, input);
    setRecipes((prev) =>
      prev.map((existing) => (existing.id === id ? recipe : existing)).sort(byUpdatedDesc),
    );
    return recipe;
  }, []);

  const deleteRecipe = useCallback(async (id: string) => {
    await recipeRepository.remove(id);
    setRecipes((prev) => prev.filter((recipe) => recipe.id !== id));
  }, []);

  const value = useMemo(
    () => ({ recipes, isLoading, loadError, loadIsSlow, getRecipe, addRecipe, editRecipe, deleteRecipe, refresh }),
    [recipes, isLoading, loadError, loadIsSlow, getRecipe, addRecipe, editRecipe, deleteRecipe, refresh],
  );

  return <RecipesContext.Provider value={value}>{children}</RecipesContext.Provider>;
}

export function useRecipes() {
  const ctx = useContext(RecipesContext);
  if (!ctx) {
    throw new Error("useRecipes must be used within a RecipesProvider");
  }
  return ctx;
}
