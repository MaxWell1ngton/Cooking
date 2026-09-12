"use client";

import { useState, type ChangeEvent } from "react";
import { compressImageFile, MAX_SOURCE_FILE_BYTES } from "@/lib/image-compression";
import { useRecipeImageUrl } from "@/lib/use-recipe-image-url";

/**
 * What the form currently intends to save, tracked separately from "what
 * signed URL is this displaying right now" so a not-yet-uploaded local
 * selection (instant object-URL preview) and an existing stored path
 * (resolved async, see RecipeImage) both work through the same field.
 */
export type PhotoState =
  | { status: "unchanged"; path: string | undefined }
  | { status: "pending"; blob: Blob; previewUrl: string }
  | { status: "removed" };

interface RecipePhotoFieldProps {
  value: PhotoState;
  onChange: (value: PhotoState) => void;
}

const boxClass = "relative h-32 w-32 shrink-0 overflow-hidden rounded-xl";

function CameraIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7l1 1.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </svg>
  );
}

export function RecipePhotoField({ value, onChange }: RecipePhotoFieldProps) {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const existingUrl = useRecipeImageUrl(value.status === "unchanged" ? value.path : undefined);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setError(null);

    if (file.size > MAX_SOURCE_FILE_BYTES) {
      setError("That image is too large. Please choose one under 20MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    setIsProcessing(true);
    try {
      const blob = await compressImageFile(file);
      if (value.status === "pending") URL.revokeObjectURL(value.previewUrl);
      onChange({ status: "pending", blob, previewUrl: URL.createObjectURL(blob) });
    } catch {
      setError("Couldn't process that image. Please try a different one.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = () => {
    if (value.status === "pending") URL.revokeObjectURL(value.previewUrl);
    setError(null);
    onChange({ status: "removed" });
  };

  const previewUrl = value.status === "pending" ? value.previewUrl : value.status === "unchanged" ? existingUrl : undefined;
  const hasPhoto = value.status === "pending" || (value.status === "unchanged" && !!value.path);

  return (
    <div>
      <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Photo</span>
      <div className="mt-2">
        <div className={boxClass}>
          {/* The whole box is the control: tapping it opens the picker
              whether adding a first photo or replacing the current one.
              The remove button below is a sibling, not nested inside the
              label, so it can't also trigger the file picker. */}
          <label
            htmlFor="recipe-photo-input"
            className="flex h-full w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50 text-stone-400 hover:border-amber-500 hover:text-amber-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-500 dark:hover:border-amber-600 dark:hover:text-amber-500"
          >
            {hasPhoto ? (
              previewUrl ? (
                // Local blob preview or a short-lived signed URL — nothing
                // next/image's build-time optimization applies to (see
                // RecipeImage.tsx for the same reasoning).
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full animate-pulse bg-stone-200 dark:bg-stone-800" />
              )
            ) : (
              <span className="flex flex-col items-center gap-1 px-2 text-center">
                <CameraIcon />
                <span className="text-xs font-medium">Add photo</span>
              </span>
            )}
            <input
              id="recipe-photo-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {isProcessing && (
            // Covers the box whether it was empty or already had a photo
            // (replacing), since compression runs before onChange updates
            // what's actually showing underneath.
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80 text-xs font-medium text-stone-600 dark:bg-stone-900/80 dark:text-stone-300">
              Processing…
            </div>
          )}

          {hasPhoto && !isProcessing && (
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remove photo"
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              ✕
            </button>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
