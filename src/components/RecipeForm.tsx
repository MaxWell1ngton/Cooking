"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createId } from "@/lib/id";
import {
  createBlankIngredient,
  flattenIngredients,
  unflattenIngredients,
  type IngredientGroupDraft,
  type IngredientsValue,
} from "@/lib/ingredient-groups";
import type { Ingredient, Recipe, RecipeInput } from "@/types/recipe";
import { EditableList, type ListRow } from "@/components/fields/EditableList";
import { IngredientFields } from "@/components/fields/IngredientFields";
import { RecipePhotoField, type PhotoState } from "@/components/fields/RecipePhotoField";
import { uploadRecipeImage, deleteRecipeImage } from "@/lib/supabase/recipe-images";

interface RecipeFormProps {
  initialRecipe?: Recipe;
  onSubmit: (input: RecipeInput) => Promise<Recipe>;
  cancelHref: string;
}

function toRows(values: string[]): ListRow[] {
  return values.length > 0 ? values.map((value) => ({ id: createId(), value })) : [{ id: createId(), value: "" }];
}

function cleanIngredientList(list: Ingredient[]): Ingredient[] {
  return list
    .map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name.trim(),
      quantity: ingredient.quantity?.trim() || undefined,
      unit: ingredient.unit?.trim() || undefined,
    }))
    .filter((ingredient) => ingredient.name.length > 0);
}

const inputClass =
  "mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-lg font-serif text-stone-900 placeholder:font-sans placeholder:text-base placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";

const textareaClass =
  "mt-2 w-full resize-y rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base leading-relaxed text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";

export function RecipeForm({ initialRecipe, onSubmit, cancelHref }: RecipeFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialRecipe?.title ?? "");
  const [ingredientsValue, setIngredientsValue] = useState<IngredientsValue>(() =>
    initialRecipe && initialRecipe.ingredients.length > 0
      ? unflattenIngredients(initialRecipe.ingredients, initialRecipe.ingredientGroups)
      : { ungrouped: [createBlankIngredient()], groups: [] },
  );
  const [steps, setSteps] = useState<ListRow[]>(() => toRows(initialRecipe?.steps ?? []));
  const [variations, setVariations] = useState<ListRow[]>(() => toRows(initialRecipe?.variations ?? []));
  const [notes, setNotes] = useState(initialRecipe?.notes ?? "");
  const [photoState, setPhotoState] = useState<PhotoState>({ status: "unchanged", path: initialRecipe?.imageUrl });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const cleanTitle = title.trim();

    // A group with no name doesn't make sense as its own section — fold its
    // ingredients back into the plain list instead of dropping them.
    let cleanUngrouped = cleanIngredientList(ingredientsValue.ungrouped);
    const cleanGroups: IngredientGroupDraft[] = [];
    for (const group of ingredientsValue.groups) {
      const groupIngredients = cleanIngredientList(group.ingredients);
      if (groupIngredients.length === 0) continue;
      const groupName = group.name.trim();
      if (groupName.length === 0) {
        cleanUngrouped = [...cleanUngrouped, ...groupIngredients];
      } else {
        cleanGroups.push({ id: group.id, name: groupName, ingredients: groupIngredients });
      }
    }

    const { ingredients: cleanIngredients, ingredientGroups: cleanIngredientGroups } = flattenIngredients({
      ungrouped: cleanUngrouped,
      groups: cleanGroups,
    });

    const cleanSteps = steps.map((row) => row.value.trim()).filter(Boolean);
    const cleanVariations = variations.map((row) => row.value.trim()).filter(Boolean);
    const cleanNotes = notes.trim();
    const hasPhoto = photoState.status === "pending" || (photoState.status === "unchanged" && !!photoState.path);

    // Every field is individually optional — the only requirement is that
    // the recipe isn't entirely empty.
    const hasAnyContent =
      cleanTitle.length > 0 ||
      cleanIngredients.length > 0 ||
      cleanSteps.length > 0 ||
      cleanVariations.length > 0 ||
      cleanNotes.length > 0 ||
      hasPhoto;

    if (!hasAnyContent) {
      setError("Add at least something before saving — a title, an ingredient, a step, or anything else.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      // Uploading (or not) happens here rather than as soon as a photo is
      // picked, so cancelling out of the form never leaves an orphaned file.
      let imageUrl: string | undefined;
      let pathToDelete: string | undefined;

      if (photoState.status === "pending") {
        imageUrl = await uploadRecipeImage(photoState.blob);
        pathToDelete = initialRecipe?.imageUrl;
      } else if (photoState.status === "removed") {
        imageUrl = undefined;
        pathToDelete = initialRecipe?.imageUrl;
      } else {
        imageUrl = photoState.path;
      }

      const recipe = await onSubmit({
        title: cleanTitle,
        ingredients: cleanIngredients,
        ingredientGroups: cleanIngredientGroups,
        steps: cleanSteps,
        variations: cleanVariations,
        notes: cleanNotes,
        imageUrl,
      });

      // Best-effort: the recipe already saved successfully either way.
      if (pathToDelete) void deleteRecipeImage(pathToDelete);

      router.push(`/recipe/?id=${recipe.id}`);
    } catch {
      setError("Something went wrong saving this recipe. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <label htmlFor="title" className="text-sm font-medium text-stone-700 dark:text-stone-300">
          Title
        </label>
        <input
          id="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Grandma's tomato sauce"
          className={inputClass}
        />
      </div>

      <RecipePhotoField value={photoState} onChange={setPhotoState} />

      <IngredientFields value={ingredientsValue} onChange={setIngredientsValue} />

      <EditableList
        label="Steps"
        rows={steps}
        onChange={setSteps}
        placeholder="Describe this step"
        multiline
        ordered
        addLabel="Add step"
      />

      <EditableList
        label="Variations"
        rows={variations}
        onChange={setVariations}
        placeholder="e.g. swap butter for olive oil"
        addLabel="Add variation"
      />

      <div>
        <label htmlFor="notes" className="text-sm font-medium text-stone-700 dark:text-stone-300">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          placeholder="Anything else worth remembering…"
          className={textareaClass}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pb-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-amber-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : initialRecipe ? "Save changes" : "Save recipe"}
        </button>
        <Link
          href={cancelHref}
          className="rounded-full px-6 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
