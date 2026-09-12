import type { Recipe, RecipeInput } from "@/types/recipe";

/**
 * Storage-agnostic contract for recipe persistence. UI code depends only on
 * this interface, so the backing store can move from localStorage to a
 * real database/API later without touching any component.
 */
export interface RecipeRepository {
  list(): Promise<Recipe[]>;
  get(id: string): Promise<Recipe | undefined>;
  create(input: RecipeInput): Promise<Recipe>;
  update(id: string, input: RecipeInput): Promise<Recipe>;
  remove(id: string): Promise<void>;
}
