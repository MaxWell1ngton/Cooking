/** Fixed set of category options offered in the recipe form and list filter. */
export const RECIPE_CATEGORIES = ["Breakfast", "Appetizer", "Main", "Dessert"] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];
