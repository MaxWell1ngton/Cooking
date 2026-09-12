"use client";

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRecipes } from "@/lib/recipes-context";
import { formatDate, formatIngredient, formatRecipeTitle } from "@/lib/format";
import { groupIngredients } from "@/lib/ingredient-groups";
import { scaleQuantityDisplay } from "@/lib/recipe-scaling";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ConfirmDialog";
import { RecipeLoadStatus } from "@/components/RecipeLoadStatus";
import { RecipeScaler } from "@/components/RecipeScaler";
import { RecipeImage } from "@/components/RecipeImage";

function RecipeDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const { isLoading, loadError, getRecipe, deleteRecipe } = useRecipes();
  const dialogRef = useRef<ConfirmDialogHandle>(null);
  const [scale, setScale] = useState(100);

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

  const handleDelete = () => {
    router.push("/");
    void deleteRecipe(recipe.id);
  };

  const displayTitle = formatRecipeTitle(recipe.title);

  return (
    <article className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-amber-700 hover:text-amber-800 dark:text-amber-500">
          ← All recipes
        </Link>
        <RecipeImage
          path={recipe.imageUrl}
          alt={displayTitle}
          className="mt-3 h-64 w-full rounded-2xl object-cover sm:h-80"
        />
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-serif text-3xl font-semibold text-stone-900 dark:text-stone-100">
            {displayTitle}
          </h1>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/recipe/edit/?id=${recipe.id}`}
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={() => dialogRef.current?.open()}
              className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              Delete
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
          Added {formatDate(recipe.createdAt)}
          {recipe.updatedAt !== recipe.createdAt ? ` · Updated ${formatDate(recipe.updatedAt)}` : ""}
        </p>
      </div>

      {recipe.ingredients.length > 0 && (
        <section>
          <h2 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
            Ingredients
          </h2>
          <div className="mt-3">
            <RecipeScaler scale={scale} onChange={setScale} />
          </div>
          <div className="mt-4 space-y-4">
            {groupIngredients(recipe.ingredients, recipe.ingredientGroups).map((section) => (
              <div key={section.id ?? "ungrouped"}>
                {section.name && (
                  <h3 className="font-serif text-base font-semibold text-stone-800 dark:text-stone-200">
                    {section.name}
                  </h3>
                )}
                <ul className={section.name ? "mt-2 space-y-1.5" : "space-y-1.5"}>
                  {section.ingredients.map((ingredient) => (
                    <li
                      key={ingredient.id}
                      className="flex gap-2 text-base leading-relaxed text-stone-700 dark:text-stone-300"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" />
                      {formatIngredient({ ...ingredient, quantity: scaleQuantityDisplay(ingredient.quantity, scale) })}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {recipe.steps.length > 0 && (
        <section>
          <h2 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">Steps</h2>
          <ol className="mt-3 space-y-4">
            {recipe.steps.map((step, index) => (
              <li
                key={index}
                className="flex gap-3 text-base leading-relaxed text-stone-700 dark:text-stone-300"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  {index + 1}
                </span>
                <p className="pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {recipe.variations.length > 0 && (
        <section>
          <h2 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
            Variations
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-base leading-relaxed text-stone-700 dark:text-stone-300">
            {recipe.variations.map((variation, index) => (
              <li key={index}>{variation}</li>
            ))}
          </ul>
        </section>
      )}

      {recipe.notes && (
        <section>
          <h2 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">Notes</h2>
          <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-stone-700 dark:text-stone-300">
            {recipe.notes}
          </p>
        </section>
      )}

      <ConfirmDialog
        ref={dialogRef}
        title={`Delete "${displayTitle}"?`}
        description="This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </article>
  );
}

export default function RecipeDetailPage() {
  return (
    <Suspense fallback={<p className="text-stone-500 dark:text-stone-400">Loading recipe…</p>}>
      <RecipeDetail />
    </Suspense>
  );
}
