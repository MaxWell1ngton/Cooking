import type { Ingredient, IngredientGroup } from "@/types/recipe";

/** Bumped whenever the backup file shape changes in a way old validators can't read. */
export const BACKUP_VERSION = 1;

/**
 * A recipe as stored inside recipes.json within the backup zip. Same shape
 * as Recipe, except imageUrl (a Supabase Storage path, meaningless outside
 * the exporting account) is replaced with imageFile — a filename inside the
 * zip's images/ folder, resolved back to a freshly-uploaded storage path on
 * import.
 */
export interface BackupRecipe {
  id: string;
  title: string;
  ingredients: Ingredient[];
  ingredientGroups: IngredientGroup[];
  steps: string[];
  variations: string[];
  notes: string;
  imageFile: string | null;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackupFile {
  version: number;
  exportedAt: string;
  recipes: BackupRecipe[];
}
