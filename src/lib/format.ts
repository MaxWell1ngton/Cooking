export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatIngredient(ingredient: { name: string; quantity?: string; unit?: string }): string {
  return [ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(" ");
}

/** Title is optional now that a recipe just needs *something* filled in — this is the display fallback. */
export function formatRecipeTitle(title: string): string {
  return title.trim() || "Untitled recipe";
}
