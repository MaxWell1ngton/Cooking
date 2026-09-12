import { supabase } from "@/lib/supabase/client";
import { LocalStorageRecipeRepository, LOCAL_RECIPES_STORAGE_KEY } from "@/lib/repository";
import { recipeToRow } from "@/lib/repository/supabaseRecipeRepository";

const localRepository = new LocalStorageRecipeRepository();

/**
 * Runs once per sign-in (see auth-context.tsx): if this browser has recipes
 * saved from before Supabase existed, upload them to the signed-in user's
 * account and clear the local copy so they aren't re-migrated (or shown as
 * duplicates) next time. Safe to call when there's nothing to migrate — it's
 * a no-op. Uses upsert (by primary key) rather than insert so re-running
 * this after a partial failure can't create duplicate rows.
 */
export async function migrateLocalRecipesToSupabase(userId: string): Promise<void> {
  const localRecipes = await localRepository.list();
  if (localRecipes.length === 0) return;

  console.info(`[cookbook] Migrating ${localRecipes.length} local recipe(s) to your account…`);

  const rows = localRecipes.map((recipe) => recipeToRow(recipe, userId));
  const { error } = await supabase.from("recipes").upsert(rows, { onConflict: "id" });

  if (error) {
    console.error("[cookbook] Migration to Supabase failed; local recipes were left untouched.", error);
    throw error;
  }

  window.localStorage.removeItem(LOCAL_RECIPES_STORAGE_KEY);
  console.info("[cookbook] Migration complete — local copy cleared.");
}
