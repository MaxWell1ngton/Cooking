"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRecipes } from "@/lib/recipes-context";
import { RecipeForm } from "@/components/RecipeForm";
import { RecipeLoadStatus } from "@/components/RecipeLoadStatus";

function EditRecipeForm() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const { isLoading, loadError, getRecipe, editRecipe } = useRecipes();
  const recipe = getRecipe(id);

  if (isLoading || loadError) {
    return <RecipeLoadStatus label="Loading recipe…" />;
  }

  if (!recipe) {
    return (
      <div className="space-y-4">
        <p className="text-stone-500 dark:text-stone-400">Recipe not found.</p>
        <Link href="/" className="text-amber-700 hover:text-amber-800 dark:text-amber-500">
          ← Back to all recipes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-100">
        Edit recipe
      </h1>
      <RecipeForm
        initialRecipe={recipe}
        onSubmit={(input) => editRecipe(recipe.id, input)}
        cancelHref={`/recipe/?id=${recipe.id}`}
      />
    </div>
  );
}

export default function EditRecipePage() {
  return (
    <Suspense fallback={<p className="text-stone-500 dark:text-stone-400">Loading recipe…</p>}>
      <EditRecipeForm />
    </Suspense>
  );
}
