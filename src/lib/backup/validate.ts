import type { Ingredient, IngredientGroup } from "@/types/recipe";
import { BACKUP_VERSION, type BackupFile, type BackupRecipe } from "./types";

export type ValidationResult = { valid: true; backup: BackupFile } | { valid: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isIngredient(value: unknown): value is Ingredient {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.quantity === undefined || typeof value.quantity === "string") &&
    (value.unit === undefined || typeof value.unit === "string") &&
    (value.groupId === undefined || typeof value.groupId === "string")
  );
}

function isIngredientGroup(value: unknown): value is IngredientGroup {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string";
}

function isBackupRecipe(value: unknown): value is BackupRecipe {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    Array.isArray(value.ingredients) &&
    value.ingredients.every(isIngredient) &&
    Array.isArray(value.ingredientGroups) &&
    value.ingredientGroups.every(isIngredientGroup) &&
    isStringArray(value.steps) &&
    isStringArray(value.variations) &&
    typeof value.notes === "string" &&
    (value.imageFile === null || typeof value.imageFile === "string") &&
    (value.tags === undefined || isStringArray(value.tags)) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

/**
 * Fully validates a parsed recipes.json before anything from it is written
 * anywhere. Every failure returns a specific, human-readable reason rather
 * than a generic "invalid file" so a user (or future version of this app)
 * has a chance of understanding what actually went wrong.
 */
export function validateBackupFile(data: unknown): ValidationResult {
  if (!isRecord(data)) {
    return { valid: false, error: "recipes.json isn't a JSON object." };
  }
  if (typeof data.version !== "number") {
    return { valid: false, error: "recipes.json is missing a valid version number." };
  }
  if (data.version > BACKUP_VERSION) {
    return {
      valid: false,
      error: `This backup was made with a newer version of Cookbook (format v${data.version}) than this app supports (v${BACKUP_VERSION}).`,
    };
  }
  if (!Array.isArray(data.recipes)) {
    return { valid: false, error: "recipes.json is missing its list of recipes." };
  }
  const badIndex = data.recipes.findIndex((recipe) => !isBackupRecipe(recipe));
  if (badIndex !== -1) {
    return { valid: false, error: `Recipe #${badIndex + 1} in the backup has an unexpected shape.` };
  }

  return {
    valid: true,
    backup: {
      version: data.version,
      exportedAt: typeof data.exportedAt === "string" ? data.exportedAt : "",
      recipes: data.recipes as BackupRecipe[],
    },
  };
}
