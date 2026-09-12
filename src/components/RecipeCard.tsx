import Link from "next/link";
import type { Recipe } from "@/types/recipe";
import { RecipeImage } from "@/components/RecipeImage";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      href={`/recipe/?id=${recipe.id}`}
      className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:hover:border-amber-700"
    >
      <RecipeImage path={recipe.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0">
        <h2 className="truncate font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
          {recipe.title}
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {recipe.ingredients.length} ingredient{recipe.ingredients.length === 1 ? "" : "s"} ·{" "}
          {recipe.steps.length} step{recipe.steps.length === 1 ? "" : "s"}
        </p>
      </div>
    </Link>
  );
}
