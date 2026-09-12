import { createId } from "@/lib/id";
import type { Recipe, RecipeInput } from "@/types/recipe";
import type { RecipeRepository } from "./types";

// Exported so the one-time Supabase migration (src/lib/supabase/migrate-local-recipes.ts)
// can read and then clear the same key without duplicating it.
export const STORAGE_KEY = "cookbook.recipes.v1";

// Fills in fields added after a recipe may have been saved (currently just
// ingredientGroups) so every consumer can rely on the full shape always
// being present, regardless of how old the stored record is.
function normalize(recipe: Recipe): Recipe {
  return {
    ...recipe,
    ingredients: recipe.ingredients ?? [],
    ingredientGroups: recipe.ingredientGroups ?? [],
    steps: recipe.steps ?? [],
    variations: recipe.variations ?? [],
    notes: recipe.notes ?? "",
  };
}

function readAll(): Recipe[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalize) : [];
  } catch {
    return [];
  }
}

function writeAll(recipes: Recipe[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

/**
 * localStorage-backed implementation of RecipeRepository. Synchronous under
 * the hood, but exposes the same async interface any future network/database
 * implementation would use.
 */
export class LocalStorageRecipeRepository implements RecipeRepository {
  async list(): Promise<Recipe[]> {
    return readAll();
  }

  async get(id: string): Promise<Recipe | undefined> {
    return readAll().find((recipe) => recipe.id === id);
  }

  async create(input: RecipeInput): Promise<Recipe> {
    const now = new Date().toISOString();
    const recipe: Recipe = {
      id: createId(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    const recipes = readAll();
    recipes.push(recipe);
    writeAll(recipes);
    return recipe;
  }

  async update(id: string, input: RecipeInput): Promise<Recipe> {
    const recipes = readAll();
    const index = recipes.findIndex((recipe) => recipe.id === id);
    if (index === -1) {
      throw new Error(`Recipe not found: ${id}`);
    }
    const updated: Recipe = {
      ...recipes[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    recipes[index] = updated;
    writeAll(recipes);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const recipes = readAll().filter((recipe) => recipe.id !== id);
    writeAll(recipes);
  }
}
