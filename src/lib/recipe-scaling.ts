/**
 * Parses an ingredient's free-form quantity string into a number, if it
 * cleanly represents one. Quantity is deliberately a plain string in the
 * data model (see types/recipe.ts) so people can write "a pinch", "to
 * taste", or a range — none of those parse, and that's intentional: only
 * unambiguous single amounts get scaled, everything else is returned
 * untouched by scaleQuantityDisplay below rather than guessed at.
 */
export function parseQuantity(quantity: string | undefined): number | null {
  if (!quantity) return null;
  const trimmed = quantity.trim();
  if (!trimmed) return null;

  const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/); // "1 1/2"
  if (mixed) {
    const denominator = Number(mixed[3]);
    if (denominator === 0) return null;
    return Number(mixed[1]) + Number(mixed[2]) / denominator;
  }

  const fraction = trimmed.match(/^(\d+)\/(\d+)$/); // "1/2"
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator === 0) return null;
    return Number(fraction[1]) / denominator;
  }

  if (/^\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed); // "2", "0.5"

  return null;
}

/** Same rounding rule for every amount, regardless of unit: >=10 rounds to a whole number, <10 rounds to the nearest 0.1. */
export function roundScaledAmount(value: number): number {
  const safe = Math.max(value, 0);
  return safe >= 10 ? Math.round(safe) : Math.round(safe * 10) / 10;
}

function formatScaledAmount(value: number): string {
  const fixed = roundScaledAmount(value).toFixed(1);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

/**
 * Scales a quantity string for display at the given percentage (100 = no
 * change). Quantities that don't parse to a plain number — "a pinch", "to
 * taste", a range, empty — are returned exactly as-is at any percentage,
 * including 0%.
 */
export function scaleQuantityDisplay(quantity: string | undefined, scalePercent: number): string | undefined {
  const parsed = parseQuantity(quantity);
  if (parsed === null) return quantity;
  return formatScaledAmount(parsed * (scalePercent / 100));
}
