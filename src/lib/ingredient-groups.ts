import { createId } from "@/lib/id";
import type { Ingredient, IngredientGroup } from "@/types/recipe";

export function createBlankIngredient(): Ingredient {
  return { id: createId(), name: "", quantity: "", unit: "" };
}

/** One named group of ingredients as edited in the form (name + its own ingredient rows). */
export interface IngredientGroupDraft {
  id: string;
  name: string;
  ingredients: Ingredient[];
}

/** The add/edit form's working shape for the whole ingredients section. */
export interface IngredientsValue {
  ungrouped: Ingredient[];
  groups: IngredientGroupDraft[];
}

/** A section to render: either a named group or the (unlabeled) ungrouped bucket. */
export interface IngredientSection {
  id: string | null;
  name: string | null;
  ingredients: Ingredient[];
}

/**
 * Splits a recipe's flat ingredient list into display sections: ungrouped
 * ingredients first (no heading — this is what an older, group-less recipe
 * looks like), then named groups in creation order.
 */
export function groupIngredients(
  ingredients: Ingredient[] | undefined | null,
  ingredientGroups: IngredientGroup[] | undefined | null,
): IngredientSection[] {
  const safeIngredients = ingredients ?? [];
  const safeGroups = ingredientGroups ?? [];
  const groupIds = new Set(safeGroups.map((group) => group.id));
  const ungrouped = safeIngredients.filter(
    (ingredient) => !ingredient.groupId || !groupIds.has(ingredient.groupId),
  );

  const sections: IngredientSection[] = [];
  if (ungrouped.length > 0) {
    sections.push({ id: null, name: null, ingredients: ungrouped });
  }
  for (const group of safeGroups) {
    sections.push({
      id: group.id,
      name: group.name,
      ingredients: safeIngredients.filter((ingredient) => ingredient.groupId === group.id),
    });
  }
  return sections;
}

/** Converts the form's draft shape back into a flat ingredient list + group list for storage. */
export function flattenIngredients(value: IngredientsValue): {
  ingredients: Ingredient[];
  ingredientGroups: IngredientGroup[];
} {
  const ingredientGroups = value.groups.map((group) => ({ id: group.id, name: group.name }));
  const ingredients: Ingredient[] = [
    ...value.ungrouped,
    ...value.groups.flatMap((group) => group.ingredients.map((ingredient) => ({ ...ingredient, groupId: group.id }))),
  ];
  return { ingredients, ingredientGroups };
}

/** Converts a stored recipe's flat shape into the form's draft shape for editing. */
export function unflattenIngredients(
  ingredients: Ingredient[] | undefined | null,
  ingredientGroups: IngredientGroup[] | undefined | null,
): IngredientsValue {
  const safeIngredients = ingredients ?? [];
  const safeGroups = ingredientGroups ?? [];
  const groupIds = new Set(safeGroups.map((group) => group.id));
  const ungrouped = safeIngredients.filter(
    (ingredient) => !ingredient.groupId || !groupIds.has(ingredient.groupId),
  );
  const groups = safeGroups.map((group) => ({
    id: group.id,
    name: group.name,
    ingredients: safeIngredients.filter((ingredient) => ingredient.groupId === group.id),
  }));
  return { ungrouped, groups };
}
