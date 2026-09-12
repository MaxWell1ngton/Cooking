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
}
