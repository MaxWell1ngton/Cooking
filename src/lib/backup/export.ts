import JSZip from "jszip";
import { downloadRecipeImage } from "@/lib/supabase/recipe-images";
import { downloadBlob } from "@/lib/download-blob";
import type { Recipe } from "@/types/recipe";
import { BACKUP_VERSION, type BackupFile, type BackupRecipe } from "./types";

export interface ExportProgress {
  phase: "images" | "compressing";
  current: number;
  total: number;
}

export interface ImageFailure {
  recipeId: string;
  recipeTitle: string;
  reason: string;
}

export interface ExportResult {
  /** Photos that could not be downloaded from Storage and were left out of the backup. */
  imageFailures: ImageFailure[];
}

function fileNameForImagePath(path: string): string {
  const segments = path.split("/");
  return segments[segments.length - 1];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Downloads every recipe's image from Storage, bundles everything into a
 * single zip (recipes.json + images/), and triggers a browser download of
 * it. A recipe whose image fails to download still gets backed up — just
 * without that photo — rather than failing the whole export; every such
 * failure is logged and returned so the caller can surface it instead of
 * the export silently completing with photos quietly missing.
 */
export async function exportBackup(
  recipes: Recipe[],
  onProgress: (progress: ExportProgress) => void,
): Promise<ExportResult> {
  const zip = new JSZip();
  const imagesFolder = zip.folder("images");
  if (!imagesFolder) throw new Error("Failed to create images/ folder in the backup archive.");

  const totalImages = recipes.filter((recipe) => !!recipe.imageUrl).length;
  let imagesDone = 0;
  onProgress({ phase: "images", current: 0, total: totalImages });
  console.info(`[cookbook:backup] export: ${recipes.length} recipe(s), ${totalImages} with a photo to download`);

  const imageFailures: ImageFailure[] = [];
  const backupRecipes: BackupRecipe[] = [];
  for (const recipe of recipes) {
    let imageFile: string | null = null;

    if (recipe.imageUrl) {
      console.info(`[cookbook:backup] export: downloading image for recipe ${recipe.id} from path "${recipe.imageUrl}"`);
      try {
        const blob = await downloadRecipeImage(recipe.imageUrl);
        console.info(`[cookbook:backup] export: downloaded ${blob.size} byte(s) (type: ${blob.type || "unknown"}) for recipe ${recipe.id}`);
        imageFile = fileNameForImagePath(recipe.imageUrl);
        imagesFolder.file(imageFile, blob);
      } catch (error) {
        console.error("[cookbook:backup] export: FAILED to download image; recipe will be backed up without it", {
          recipeId: recipe.id,
          imagePath: recipe.imageUrl,
          error,
        });
        imageFailures.push({ recipeId: recipe.id, recipeTitle: recipe.title, reason: errorMessage(error) });
        imageFile = null;
      }
      imagesDone += 1;
      onProgress({ phase: "images", current: imagesDone, total: totalImages });
    }

    backupRecipes.push({
      id: recipe.id,
      title: recipe.title,
      ingredients: recipe.ingredients,
      ingredientGroups: recipe.ingredientGroups,
      steps: recipe.steps,
      variations: recipe.variations,
      notes: recipe.notes,
      imageFile,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
    });
  }

  const backup: BackupFile = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    recipes: backupRecipes,
  };
  zip.file("recipes.json", JSON.stringify(backup, null, 2));

  onProgress({ phase: "compressing", current: 0, total: 100 });
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" }, (metadata) => {
    onProgress({ phase: "compressing", current: Math.round(metadata.percent), total: 100 });
  });

  const dateStamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `cookbook-backup-${dateStamp}.zip`);

  if (imageFailures.length > 0) {
    console.warn(`[cookbook:backup] export finished with ${imageFailures.length} photo(s) missing`, imageFailures);
  }

  return { imageFailures };
}
