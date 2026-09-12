"use client";

import { useEffect, useState } from "react";
import { resolveRecipeImageUrl } from "@/lib/supabase/recipe-images";

/**
 * Resolves a recipe's stored image path to a displayable (signed) URL.
 * Returns undefined while there's nothing to show yet — either no path at
 * all, or a resolution still in flight — so callers can tell "no photo"
 * apart from "photo loading" via the `path` argument they already have.
 */
export function useRecipeImageUrl(path: string | undefined): string | undefined {
  // Resolution is async, but "this result is for an old path" needs to be
  // knowable synchronously so a stale image never flashes. Storing the path
  // a resolved URL belongs to lets the return value discard it during
  // render (React's recommended pattern for this) instead of clearing state
  // from inside the effect, which would trigger an extra render.
  const [resolved, setResolved] = useState<{ path: string; url: string | undefined } | null>(null);

  useEffect(() => {
    if (!path) return;
    let active = true;

    resolveRecipeImageUrl(path).then((url) => {
      if (active) setResolved({ path, url });
    });

    return () => {
      active = false;
    };
  }, [path]);

  return resolved && resolved.path === path ? resolved.url : undefined;
}
