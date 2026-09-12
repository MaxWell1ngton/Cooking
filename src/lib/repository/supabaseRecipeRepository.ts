import { supabase } from "@/lib/supabase/client";
import { createId } from "@/lib/id";
import type { Ingredient, IngredientGroup, Recipe, RecipeInput } from "@/types/recipe";
import type { RecipeRepository } from "./types";

const TABLE = "recipes";

// Mirrors the `recipes` table in supabase/schema.sql. Supabase's client
// returns untyped rows without generated types, so this stays defensive
// (?? fallbacks) the same way localStorageRepository's normalize() does.
interface RecipeRow {
  id: string;
  user_id: string;
  title: string;
  ingredients: Ingredient[] | null;
  ingredient_groups: IngredientGroup[] | null;
  steps: string[] | null;
  variations: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function rowToRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    title: row.title,
    ingredients: row.ingredients ?? [],
    ingredientGroups: row.ingredient_groups ?? [],
    steps: row.steps ?? [],
    variations: row.variations ?? [],
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Builds an insertable row for a full Recipe (id + timestamps included).
 * Used by create() below and by the one-time local-storage migration, which
 * needs to preserve the original id/createdAt/updatedAt rather than minting
 * new ones.
 */
export function recipeToRow(recipe: Recipe, userId: string): RecipeRow {
  return {
    id: recipe.id,
    user_id: userId,
    title: recipe.title,
    ingredients: recipe.ingredients,
    ingredient_groups: recipe.ingredientGroups,
    steps: recipe.steps,
    variations: recipe.variations,
    notes: recipe.notes,
    created_at: recipe.createdAt,
    updated_at: recipe.updatedAt,
  };
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Cannot create a recipe while signed out.");
  return data.user.id;
}

/**
 * Supabase-backed implementation of RecipeRepository. Row Level Security on
 * the `recipes` table (see supabase/schema.sql) restricts every query to the
 * signed-in user's own rows, so list()/get() don't need an explicit
 * user filter — only create() needs the user id, to satisfy the insert policy.
 */
export class SupabaseRecipeRepository implements RecipeRepository {
  async list(): Promise<Recipe[]> {
    const { data, error } = await supabase.from(TABLE).select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToRecipe);
  }

  async get(id: string): Promise<Recipe | undefined> {
    const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? rowToRecipe(data) : undefined;
  }

  async create(input: RecipeInput): Promise<Recipe> {
    const userId = await requireUserId();
    const now = new Date().toISOString();
    const recipe: Recipe = { id: createId(), ...input, createdAt: now, updatedAt: now };

    const { data, error } = await supabase.from(TABLE).insert(recipeToRow(recipe, userId)).select().single();
    if (error) throw error;
    return rowToRecipe(data);
  }

  async update(id: string, input: RecipeInput): Promise<Recipe> {
    const row = {
      title: input.title,
      ingredients: input.ingredients,
      ingredient_groups: input.ingredientGroups,
      steps: input.steps,
      variations: input.variations,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from(TABLE).update(row).eq("id", id).select().single();
    if (error) throw error;
    return rowToRecipe(data);
  }

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw error;
  }
}
