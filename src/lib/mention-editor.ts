import { parseStepText, groupLinkToken } from "@/lib/step-group-links";

export interface GroupOption {
  id: string;
  name: string;
}

interface DisplaySegment {
  /** What the textarea actually shows for this run of text. */
  displayText: string;
  /** What gets persisted for this run — a real [[group:id]] token for a link, the same text otherwise. */
  storedText: string;
  isLink: boolean;
}

function displayNameFor(groupId: string, groups: GroupOption[]): string {
  const group = groups.find((candidate) => candidate.id === groupId);
  if (!group) return "(group removed)";
  return group.name.trim() || "(unnamed group)";
}

/**
 * Turns the persisted step text into segments the textarea can show: a
 * group-link token becomes a short "@GroupName" run (its current name,
 * looked up fresh — so a rename or deletion is reflected immediately)
 * instead of the raw [[group:id]] markup.
 */
export function buildDisplaySegments(storedValue: string, groups: GroupOption[]): DisplaySegment[] {
  return parseStepText(storedValue).map((segment) =>
    segment.type === "text"
      ? { displayText: segment.text, storedText: segment.text, isLink: false }
      : {
          displayText: `@${displayNameFor(segment.groupId, groups)}`,
          storedText: groupLinkToken(segment.groupId),
          isLink: true,
        },
  );
}

export function toDisplayValue(segments: DisplaySegment[]): string {
  return segments.map((segment) => segment.displayText).join("");
}

interface DiffResult {
  start: number;
  oldEnd: number;
  newEnd: number;
}

/** Finds the single contiguous region that changed between two strings — true for any one text-input edit (typing, backspacing, pasting, IME commit). */
export function diffReplace(oldStr: string, newStr: string): DiffResult {
  const maxPrefix = Math.min(oldStr.length, newStr.length);
  let start = 0;
  while (start < maxPrefix && oldStr[start] === newStr[start]) start++;

  let oldEnd = oldStr.length;
  let newEnd = newStr.length;
  while (oldEnd > start && newEnd > start && oldStr[oldEnd - 1] === newStr[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  return { start, oldEnd, newEnd };
}

/**
 * Reconciles a raw textarea edit back into the underlying stored value.
 * Any segment the edit doesn't touch keeps its original token form; a
 * segment the edit overlaps at all — even one character of a group-link
 * chip — gets flattened into plain text. A plain <textarea> can't protect
 * part of a chip from being edited, so a chip you partially edit simply
 * stops being a link, rather than the app trying to guess and repair it.
 */
export function reconcileEdit(
  storedValue: string,
  groups: GroupOption[],
  oldDisplayValue: string,
  newDisplayValue: string,
): string {
  const segments = buildDisplaySegments(storedValue, groups);
  const { start, oldEnd, newEnd } = diffReplace(oldDisplayValue, newDisplayValue);
  const insertedText = newDisplayValue.slice(start, newEnd);

  const bounds = segments.map((segment) => segment.displayText.length);
  let cursor = 0;
  let firstIndex = -1;
  let lastIndex = -1;
  for (let i = 0; i < segments.length; i++) {
    const segStart = cursor;
    const segEnd = cursor + bounds[i];
    const overlaps = segStart < oldEnd && segEnd > start;
    const touchesEmptyBoundary = start === oldEnd && start === segStart && segStart === segEnd;
    if (overlaps || touchesEmptyBoundary) {
      if (firstIndex === -1) firstIndex = i;
      lastIndex = i;
    }
    cursor = segEnd;
  }

  // A pure insertion sitting exactly on a segment boundary overlaps neither
  // neighbor's (non-empty) range. Prefer extending whichever neighbor is
  // plain text — extending a link segment instead would silently flatten
  // it into plain text the moment you type right after (or before) it,
  // which is exactly what typing to continue a sentence after an inserted
  // mention does.
  if (firstIndex === -1) {
    cursor = 0;
    for (let i = 0; i < segments.length; i++) {
      const segStart = cursor;
      const segEnd = cursor + bounds[i];
      if (!segments[i].isLink && (segEnd === start || segStart === start)) {
        firstIndex = i;
        lastIndex = i;
        break;
      }
      cursor = segEnd;
    }
  }
  // Every neighbor at this boundary is a link (or the boundary sits at the
  // very start/end of an all-link value) — splice in a standalone new
  // plain-text segment rather than touching either link.
  if (firstIndex === -1) {
    cursor = 0;
    let spliceIndex = segments.length;
    for (let i = 0; i < segments.length; i++) {
      cursor += bounds[i];
      if (cursor >= start) {
        spliceIndex = cursor === start ? i + 1 : i;
        break;
      }
    }
    const before = segments
      .slice(0, spliceIndex)
      .map((segment) => segment.storedText)
      .join("");
    const after = segments
      .slice(spliceIndex)
      .map((segment) => segment.storedText)
      .join("");
    return before + insertedText + after;
  }

  let segStartOf = 0;
  for (let i = 0; i < firstIndex; i++) segStartOf += bounds[i];
  const firstSegStart = segStartOf;
  let lastSegStart = segStartOf;
  for (let i = firstIndex; i < lastIndex; i++) lastSegStart += bounds[i];

  const before = segments
    .slice(0, firstIndex)
    .map((segment) => segment.storedText)
    .join("");
  const after = segments
    .slice(lastIndex + 1)
    .map((segment) => segment.storedText)
    .join("");
  const firstSeg = segments[firstIndex];
  const lastSeg = segments[lastIndex];
  const prefix = firstSeg.displayText.slice(0, Math.max(start - firstSegStart, 0));
  const suffix = lastSeg.displayText.slice(Math.max(oldEnd - lastSegStart, 0));

  return before + prefix + insertedText + suffix + after;
}

/** Maps a display-string position to the equivalent stored-string position — only meaningful inside a plain-text segment (the only place this is used: right after a freshly-typed "@"). */
function mapDisplayIndexToStoredIndex(segments: DisplaySegment[], displayIndex: number): number {
  let displayCursor = 0;
  let storedCursor = 0;
  for (const segment of segments) {
    const segEnd = displayCursor + segment.displayText.length;
    if (displayIndex <= segEnd) return storedCursor + (displayIndex - displayCursor);
    displayCursor = segEnd;
    storedCursor += segment.storedText.length;
  }
  return storedCursor;
}

/**
 * Replaces the "@" just typed right before `displayCaretPos` with a real
 * link to `groupId`. Returns the new stored value and where the cursor
 * should land next, in display coordinates.
 */
export function insertGroupChip(
  storedValue: string,
  groups: GroupOption[],
  displayCaretPos: number,
  groupId: string,
): { value: string; cursor: number } {
  const segments = buildDisplaySegments(storedValue, groups);
  const storedCaretPos = mapDisplayIndexToStoredIndex(segments, displayCaretPos);
  const token = groupLinkToken(groupId);
  const value = storedValue.slice(0, storedCaretPos - 1) + token + storedValue.slice(storedCaretPos);
  const chipDisplayLength = `@${displayNameFor(groupId, groups)}`.length;
  return { value, cursor: displayCaretPos - 1 + chipDisplayLength };
}
