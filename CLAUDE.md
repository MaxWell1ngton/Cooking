@AGENTS.md

# Cookbook — project state

A personal recipe-cookbook Progressive Web App. Next.js App Router, static
export (`output: "export"`, fully client-rendered), TypeScript, Tailwind CSS
v4, Supabase backend (Auth + Postgres + Storage). Deployed on Vercel.

## What's built

**Core recipes**: CRUD for title, ingredients (qty/unit/name), ordered steps,
variations, notes, timestamps, photo. Every field is optional — the only
requirement is the recipe isn't completely empty; a title-less recipe shows
as "Untitled recipe". Storage is abstracted behind a `RecipeRepository`
interface (`src/lib/repository/types.ts`) with two implementations:
`localStorageRepository.ts` (unused now, kept for reference/offline fallback)
and `supabaseRecipeRepository.ts` (the live one).

**Ingredients**: can be grouped into named sections (e.g. "Dry mix"), with
drag-and-drop for reordering within a group, moving between groups, and
reordering whole groups (plus the ungrouped section) — all via `@dnd-kit`,
coexisting through a shared `DndContext` with type-discriminated drag data.
Enter in an ingredient row adds a new row and focuses its quantity field.

**Ingredient group links in steps**: type "@" in a step to open a dropdown of
the recipe's ingredient groups (no free-text filtering — arrow keys + Enter/
Tab or click to pick, Escape to dismiss). Picking one inserts a clean
`@GroupName` run into the visible text; internally the step still stores a
real `[[group:id]]` token (`src/lib/step-group-links.ts`), so the reference
survives a rename (verified live) and degrades gracefully to plain text /
"(ingredient group removed)" if the group is deleted or emptied. The
edit-side logic (`src/lib/mention-editor.ts`, `src/components/fields/
MentionStepField.tsx`) treats the mention as a segment-based display over
the real stored string, reconciling edits back via a text diff rather than
live character-level matching (an earlier, more complex version that
color-highlighted matches while typing was scrapped — it rendered raw
markup and had cursor/highlight bugs; this simpler version replaced it).
Step textareas auto-grow to fit content instead of scrolling internally.
Detail view renders the link styled (amber, underlined) with a hover/tap
popover listing the group's ingredients at the current scaler percentage.

**Recipe scaler**: 0–500% slider (click-to-edit for custom values outside
that range), real-time proportional scaling, non-numeric amounts ("a pinch")
left as-is. Rounding: ≥10 → whole number, <10 → nearest 0.1. Display-only,
never persisted (`src/lib/recipe-scaling.ts`).

**Photos**: upload with client-side compression (`src/lib/image-compression.ts`),
stored in a private Supabase Storage bucket (`recipe-images`) with RLS
scoped by `<user_id>/` path prefix. `Recipe.imageUrl` holds the storage
*path*, resolved to a short-lived signed URL at display time
(`resolveRecipeImageUrl` / `useRecipeImageUrl`) since the bucket isn't
public. Tap the empty placeholder to add a photo; tap the existing photo for
a replace/remove overlay.

**Auth**: email/password via Supabase Auth, gating the whole app
(`AuthGate.tsx` / `AuthScreen.tsx`). Sign-up is back (it was hidden for a
while when sign-ups were disabled project-side; re-enabled and restored with
a sign-in/sign-up toggle), handling both the "confirmed immediately" and
"check your email to confirm" cases depending on the project's email-
confirmation setting. One-time migration copies any pre-existing
localStorage recipes to Supabase on first sign-in
(`src/lib/supabase/migrate-local-recipes.ts`).

**Backup export/import** (Settings page, gear icon in the header): exports
all recipes + photos as a zip (`cookbook-backup-<date>.zip`: `recipes.json`
+ `images/`), built client-side with JSZip. Import validates the file's
structure before writing anything, and — if any recipe id already exists —
asks whether to skip, overwrite, or import as new copies
(`ImportDuplicateDialog.tsx`). Both directions log progress/failures per
step and surface a warning in the UI naming any recipe whose photo couldn't
be included/restored, rather than failing silently (`src/lib/backup/`).

## Known issues fixed along the way (worth remembering)

- **Supabase Storage upload silently ignores the `contentType` option for
  Blob bodies** — the request's real Content-Type comes only from the
  Blob's own `.type`. This broke backup-imported photos (a blob read out of
  a zip has no MIME type, defaults to `application/octet-stream`, which the
  bucket's MIME allowlist rejects). Fixed in `uploadRecipeImage()`
  (`src/lib/supabase/recipe-images.ts`) by re-wrapping the blob with the
  correct type before upload — this was hard to catch because a mocked test
  backend doesn't enforce MIME-type policies the way a real bucket does.
- Auto-growing a border-box textarea needs `scrollHeight + border width`,
  not just `scrollHeight`, or it's a couple pixels short and still scrolls.
- A `<textarea>` can't color part of its own text — the mention editor's
  "clean readable text with an ID reference underneath" is achieved via a
  segment model (parse stored value → display segments → diff-reconcile
  edits back), not a pixel-aligned overlay (which was tried first and
  didn't hold up — raw markup leaked and edits near a chip corrupted it).

## Standing constraints for future work in this repo

- `.env.local` has real Supabase credentials — never commit it, never let
  automated tests hit the real backend (every Playwright test mocks the
  Supabase host and asserts nothing leaked to the real one).
- No DDL/schema access to the real Supabase project — hand SQL to the user
  to run themselves (`supabase/schema.sql`).
- Only commit/push when explicitly asked — including each time, even right
  after a prior commit was approved in the same session. Split into
  separate commits when changes cover genuinely distinct features.
- Verify every feature via real Playwright-driven-Edge testing (no
  computer-use tool available), not just lint/build. When a mock's behavior
  is uncertain, discover the real wire format empirically first.
- If you stop the `npm run dev` server for any reason (e.g. to run a build
  or lint check, or to free the port), always restart it afterward before
  finishing your response, so the dev server is left running for the user.
  Don't leave it stopped without explicitly telling the user it's stopped
  and why.

## Next steps / not yet done

- No automated CI — Playwright scripts live in a scratchpad directory and
  are run manually per session, not wired into a pipeline.
- The mention editor's "editing into or across an inserted `@GroupName`
  turns it back into plain text" is an intentional simplification, not a
  bug — worth keeping in mind if it comes up as a future complaint.
- Nothing is currently in progress; the last completed work was the
  mention-based group-link rework and restoring sign-up.
