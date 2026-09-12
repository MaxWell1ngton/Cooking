const GROUP_LINK_PATTERN = /\[\[group:([^\]]+)\]\]/g;

export type StepSegment = { type: "text"; text: string } | { type: "group-link"; groupId: string };

/**
 * Splits a step's raw text into plain-text runs and [[group:<id>]]
 * references. Storing the id (not the group's name) is what keeps a link
 * correct if the group is later renamed — the current name is always
 * looked up fresh at render time, never baked into the step text.
 */
export function parseStepText(step: string): StepSegment[] {
  const segments: StepSegment[] = [];
  let lastIndex = 0;

  for (const match of step.matchAll(GROUP_LINK_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) segments.push({ type: "text", text: step.slice(lastIndex, index) });
    segments.push({ type: "group-link", groupId: match[1] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < step.length || segments.length === 0) {
    segments.push({ type: "text", text: step.slice(lastIndex) });
  }
  return segments;
}

/** The markup to insert for a group reference — always via UI, never hand-typed. */
export function groupLinkToken(groupId: string): string {
  return `[[group:${groupId}]]`;
}
