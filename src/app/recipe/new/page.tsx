"use client";

import { useRecipes } from "@/lib/recipes-context";
import { RecipeForm } from "@/components/RecipeForm";

export default function NewRecipePage() {
  const { addRecipe } = useRecipes();

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-100">
        New recipe
      </h1>
      <RecipeForm onSubmit={addRecipe} cancelHref="/" />
    </div>
  );
}
