// Recompressing to a bounded JPEG keeps a phone-camera photo (often 4-12MB)
// from bloating storage or slowing the recipe list down. Every upload ends
// up as JPEG regardless of source format, which also sidesteps needing to
// detect/preserve the original extension.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

/** Reject absurdly large files before even trying to decode them. */
export const MAX_SOURCE_FILE_BYTES = 20 * 1024 * 1024;

/**
 * Resizes (longest side capped at 1600px) and re-encodes an image file as a
 * JPEG blob via the canvas. Falls back to the original file untouched if
 * the browser can't decode/canvas it — better to upload the original than
 * to block someone from adding a photo at all.
 */
export async function compressImageFile(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
      const width = Math.round(bitmap.width * scale);
      const height = Math.round(bitmap.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;

      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
      return blob ?? file;
    } finally {
      bitmap.close();
    }
  } catch (error) {
    console.error("[cookbook] Image compression failed, uploading original file instead", error);
    return file;
  }
}
