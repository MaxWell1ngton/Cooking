"use client";

import { useRecipeImageUrl } from "@/lib/use-recipe-image-url";

interface RecipeImageProps {
  path: string | undefined;
  alt: string;
  className: string;
}

/**
 * Renders nothing at all when there's no photo — no placeholder graphic, no
 * broken-image icon — and a same-sized skeleton while the signed URL for an
 * existing photo is still resolving, so the layout doesn't jump once it
 * arrives.
 */
export function RecipeImage({ path, alt, className }: RecipeImageProps) {
  const url = useRecipeImageUrl(path);

  if (!path) return null;
  if (!url) return <div className={`${className} animate-pulse bg-stone-200 dark:bg-stone-800`} />;
  // next/image needs either its Optimization API (unavailable for this
  // static export) or a remote loader, for what would be a no-op here
  // anyway — every upload is already resized/compressed client-side (see
  // image-compression.ts), and the src is a short-lived signed URL, not
  // something to optimize at build time.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}
