import { SupabaseRecipeRepository } from "./supabaseRecipeRepository";
import type { RecipeRepository } from "./types";

export type { RecipeRepository } from "./types";
// Kept in use only by the one-time local->Supabase migration
// (src/lib/supabase/migrate-local-recipes.ts) and available as a building
// block if an offline-first hybrid repository is added later.
export { LocalStorageRecipeRepository, STORAGE_KEY as LOCAL_RECIPES_STORAGE_KEY } from "./localStorageRepository";

// Active backend. Every consumer talks to the RecipeRepository interface,
// not this class, so swapping backends again later is a one-line change.
export const recipeRepository: RecipeRepository = new SupabaseRecipeRepository();
