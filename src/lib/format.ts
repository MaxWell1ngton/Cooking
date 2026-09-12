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
