import { supabase } from "@/lib/supabase/client";
import { createId } from "@/lib/id";

const BUCKET = "recipe-images";
// Regenerated every time a recipe is loaded (see use-recipe-image-url.ts),
// so this only needs to comfortably outlast a single page view.
const SIGNED_URL_TTL_SECONDS = 60 * 60;

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Cannot manage recipe images while signed out.");
  return data.user.id;
}

/**
 * Uploads an already-compressed image blob and returns its storage path.
 * Objects live at "<user_id>/<random>.jpg" — the leading user id segment is
 * what the bucket's RLS policies (see supabase/schema.sql) check ownership
 * against, and a fresh random id per upload means replacing a photo never
 * collides with (or silently overwrites) the previous one.
 */
export async function uploadRecipeImage(blob: Blob): Promise<string> {
  const userId = await requireUserId();
  const path = `${userId}/${createId()}.jpg`;

  // supabase-js's upload() silently ignores the `contentType` option whenever
  // the body is a Blob — it hands the Blob straight to FormData, so the
  // request's actual Content-Type comes only from the Blob's own `.type`.
  // A blob read back out of a zip archive (see backup/import.ts) has no
  // stored MIME type at all and defaults to application/octet-stream, which
  // the bucket's MIME allowlist then rejects — so force the type here rather
  // than trust the option below to do anything for a Blob body.
  const typedBlob = blob.type === "image/jpeg" ? blob : new Blob([blob], { type: "image/jpeg" });

  const { error } = await supabase.storage.from(BUCKET).upload(path, typedBlob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/** Downloads the actual image bytes — used for backup export, not display (see resolveRecipeImageUrl for that). */
export async function downloadRecipeImage(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw error;
  return data;
}

/** Best-effort cleanup for a replaced or removed photo — never throws. */
export async function deleteRecipeImage(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.error("[cookbook] Failed to delete recipe image", path, error);
}

/**
 * Resolves a storage path to a short-lived signed URL for display. The
 * bucket is private, so there is no stable public URL to cache — this is
 * called fresh each time an image needs to be shown (see
 * use-recipe-image-url.ts). Returns undefined (rather than throwing) on
 * failure so a broken/expired reference degrades to "no photo" instead of
 * crashing the page.
 */
export async function resolveRecipeImageUrl(path: string | undefined): Promise<string | undefined> {
  if (!path) return undefined;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) {
    console.error("[cookbook] Failed to resolve recipe image URL", path, error);
    return undefined;
  }
  return data.signedUrl;
}
