export interface Ingredient {
  id: string;
  name: string;
  quantity?: string;
  unit?: string;
  /** References IngredientGroup.id. Absent (or pointing at a missing group) means ungrouped. */
  groupId?: string;
}

export interface IngredientGroup {
  id: string;
  name: string;
}

export interface Recipe {
  id: string;
  title: string;
  ingredients: Ingredient[];
  /** Ordered by creation. Rendered as subheadings; older recipes have none. */
  ingredientGroups: IngredientGroup[];
  steps: string[];
  variations: string[];
  notes: string;
  /**
   * A Supabase Storage object path (e.g. "<user_id>/<id>.jpg"), not a
   * directly-usable URL — the image bucket is private, so a display URL is
   * resolved from this path on read (see src/lib/supabase/recipe-images.ts).
   * Absent for recipes with no photo, including every recipe saved before
   * this field existed.
   */
  imageUrl?: string;
  /** Free-form; PRESET_TAGS (src/lib/recipe-tags.ts) are just quick-pick suggestions, not an enum. Absent/empty means untagged. */
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RecipeInput {
  title: string;
  ingredients: Ingredient[];
  ingredientGroups: IngredientGroup[];
  steps: string[];
  variations: string[];
  notes: string;
  imageUrl?: string;
  tags?: string[];
}
