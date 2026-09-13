import JSZip from "jszip";
import { supabase } from "@/lib/supabase/client";
import { createId } from "@/lib/id";
import { uploadRecipeImage } from "@/lib/supabase/recipe-images";
import { recipeToRow } from "@/lib/repository/supabaseRecipeRepository";
import type { Recipe } from "@/types/recipe";
import { validateBackupFile } from "./validate";
import type { BackupFile } from "./types";

export type ImportStrategy = "skip" | "overwrite" | "copy";

export interface ParsedBackup {
  backup: BackupFile;
  zip: JSZip;
}

export type ParseResult = { ok: true; parsed: ParsedBackup } | { ok: false; error: string };

/** Reads and fully validates a backup file. Never writes anything — safe to call just to check a file. */
export async function parseBackupFile(file: File): Promise<ParseResult> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    return { ok: false, error: "That doesn't look like a zip file." };
  }

  const recipesEntry = zip.file("recipes.json");
  if (!recipesEntry) {
    return { ok: false, error: "This zip doesn't contain a recipes.json — it's not a Cookbook backup." };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(await recipesEntry.async("string"));
  } catch {
    return { ok: false, error: "recipes.json in this backup isn't valid JSON." };
  }

  const validation = validateBackupFile(parsedJson);
  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  return { ok: true, parsed: { backup: validation.backup, zip } };
}

/** Which backup recipe ids already exist for this user — used to decide whether a strategy prompt is needed. */
export function findDuplicateIds(backup: BackupFile, existingIds: ReadonlySet<string>): string[] {
  return backup.recipes.filter((recipe) => existingIds.has(recipe.id)).map((recipe) => recipe.id);
}

export interface ImportProgress {
  current: number;
  total: number;
}

export interface ImageFailure {
  recipeId: string;
  recipeTitle: string;
  reason: string;
}

export interface ImportSummary {
  imported: number;
  skipped: number;
  /** Recipes that imported successfully but whose photo could not be restored. */
  imageFailures: ImageFailure[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Writes the backup's recipes for the signed-in user, per the chosen
 * strategy:
 *  - "skip": recipes whose id already exists are left untouched.
 *  - "overwrite": recipes whose id already exists are replaced in place.
 *  - "copy": every recipe gets a brand-new id, so nothing can collide.
 * Only the recipe's own top-level id changes for "copy" — ingredient,
 * ingredient-group, and step-embedded [[group:id]] references are left
 * exactly as they are, since those only need to stay internally consistent
 * with each other, not globally unique.
 * Goes straight to Supabase (like the local-storage migration does) rather
 * than through RecipeRepository.create()/update(), because those always
 * mint their own id and can't preserve — or deliberately replace — a
 * specific one, which skip/overwrite both depend on.
 */
export async function performImport(
  parsed: ParsedBackup,
  strategy: ImportStrategy,
  existingIds: ReadonlySet<string>,
  userId: string,
  onProgress: (progress: ImportProgress) => void,
): Promise<ImportSummary> {
  const { backup, zip } = parsed;
  const total = backup.recipes.length;
  let skipped = 0;
  const rows: ReturnType<typeof recipeToRow>[] = [];
  const imageFailures: ImageFailure[] = [];
  console.info(`[cookbook:backup] import: ${total} recipe(s) in backup, strategy="${strategy}"`);

  for (let index = 0; index < backup.recipes.length; index++) {
    const backupRecipe = backup.recipes[index];
    onProgress({ current: index + 1, total });

    if (strategy === "skip" && existingIds.has(backupRecipe.id)) {
      skipped += 1;
      console.info(`[cookbook:backup] import: skipping recipe ${backupRecipe.id} (already exists, strategy="skip")`);
      continue;
    }

    let imageUrl: string | undefined;
    if (backupRecipe.imageFile) {
      const zipPath = `images/${backupRecipe.imageFile}`;
      const imageEntry = zip.file(zipPath);
      if (!imageEntry) {
        console.error(`[cookbook:backup] import: FAILED — recipes.json references "${backupRecipe.imageFile}" but "${zipPath}" is missing from the zip`, {
          recipeId: backupRecipe.id,
        });
        imageFailures.push({
          recipeId: backupRecipe.id,
          recipeTitle: backupRecipe.title,
          reason: `${zipPath} was missing from the backup file`,
        });
      } else {
        try {
          const blob = await imageEntry.async("blob");
          console.info(`[cookbook:backup] import: extracted ${blob.size} byte(s) from "${zipPath}" for recipe ${backupRecipe.id}, uploading...`);
          imageUrl = await uploadRecipeImage(blob);
          console.info(`[cookbook:backup] import: uploaded photo for recipe ${backupRecipe.id} -> "${imageUrl}"`);
        } catch (error) {
          console.error("[cookbook:backup] import: FAILED to re-upload image; recipe will import without it", {
            recipeId: backupRecipe.id,
            zipPath,
            error,
          });
          imageFailures.push({ recipeId: backupRecipe.id, recipeTitle: backupRecipe.title, reason: errorMessage(error) });
        }
      }
    }

    const recipe: Recipe = {
      id: strategy === "copy" ? createId() : backupRecipe.id,
      title: backupRecipe.title,
      ingredients: backupRecipe.ingredients,
      ingredientGroups: backupRecipe.ingredientGroups,
      steps: backupRecipe.steps,
      variations: backupRecipe.variations,
      notes: backupRecipe.notes,
      imageUrl,
      category: backupRecipe.category,
      createdAt: backupRecipe.createdAt,
      updatedAt: backupRecipe.updatedAt,
    };

    console.info(`[cookbook:backup] import: recipe ${recipe.id} row will be written with image_path = ${imageUrl ?? "null"}`);
    rows.push(recipeToRow(recipe, userId));
  }

  if (rows.length > 0) {
    // Safe as a single upsert regardless of strategy: "skip" already
    // filtered out every id that could conflict, "copy" never reuses an
    // existing id, and "overwrite" is exactly what upsert is for.
    const { error } = await supabase.from("recipes").upsert(rows, { onConflict: "id" });
    if (error) {
      console.error("[cookbook:backup] import: FAILED to upsert recipe rows", error);
      throw error;
    }
    console.info(`[cookbook:backup] import: upserted ${rows.length} row(s) successfully`);
  }

  if (imageFailures.length > 0) {
    console.warn(`[cookbook:backup] import finished with ${imageFailures.length} photo(s) not restored`, imageFailures);
  }

  return { imported: rows.length, skipped, imageFailures };
}
