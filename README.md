# Cookbook

A personal, installable, offline-friendly cookbook for your own recipes. Built with Next.js (App Router) and Tailwind CSS.

## Getting started

1. Create a Supabase project, then run [supabase/schema.sql](supabase/schema.sql) in its SQL editor (Project → SQL Editor → New query) to create the `recipes` table and its Row Level Security policies.
2. Copy `.env.local.example` to `.env.local` and fill in your project's URL and anon key (Project Settings → API).
3. ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000). You'll land on a sign-in/sign-up screen — recipes only load once authenticated.

## Building for production

```bash
npm run build
```

This produces a fully static site in `out/` (see "Architecture" below) — no Node server required at runtime. Serve it with any static file server, e.g.:

```bash
npx serve out
```

For it to install as a PWA, it needs to be served over HTTPS (or `localhost`).

## Architecture

- **Data model** — [src/types/recipe.ts](src/types/recipe.ts): a `Recipe` has a title, ingredients (each with an optional quantity/unit and an optional `groupId`), an ordered list of `ingredientGroups` (e.g. "Dry mix", "Wet mix") for recipes that want named sections, an ordered list of steps, optional variations, optional notes, and timestamps. Ingredients with no group (or a `groupId` that doesn't match any group) render as one plain list — this is what every recipe saved before grouping existed looks like, so old data needed no migration. [src/lib/ingredient-groups.ts](src/lib/ingredient-groups.ts) has the conversions between this flat storage shape and the form's editing shape.
- **Storage layer** — [src/lib/repository/](src/lib/repository/) defines a `RecipeRepository` interface ([types.ts](src/lib/repository/types.ts)). The active implementation is [supabaseRecipeRepository.ts](src/lib/repository/supabaseRecipeRepository.ts), wired up in [src/lib/repository/index.ts](src/lib/repository/index.ts) — every consumer talks to the interface, not the class, so swapping backends again is a one-line change there. [localStorageRepository.ts](src/lib/repository/localStorageRepository.ts) still exists and still works (it also normalizes older records that predate `ingredientGroups`) but is unused by the app itself now, except as the source for the one-time migration below — kept around as a building block if an offline-first hybrid (e.g. localStorage cache in front of Supabase) gets built later.
- **Auth** — [src/lib/auth/auth-context.tsx](src/lib/auth/auth-context.tsx) wraps Supabase email/password auth in a context; [AuthGate.tsx](src/components/AuthGate.tsx) in the root layout shows [AuthScreen.tsx](src/components/AuthScreen.tsx) until signed in, so `RecipesProvider` — and therefore any recipe load — never mounts for a signed-out visitor.
- **Migration from local storage** — the first time `AuthProvider` sees a session (fresh sign-in or a page reload with an existing one), it calls [migrate-local-recipes.ts](src/lib/supabase/migrate-local-recipes.ts): if `cookbook.recipes.v1` still has recipes in it, they're upserted into Supabase (by id, so it's safe to retry) tagged with the signed-in user's id, preserving original ids/timestamps, and local storage is cleared only after that succeeds. If there's nothing local to migrate it's a no-op.
- **Add/edit form** — ingredient and step entries use [dnd-kit](https://dndkit.com/) for drag-and-drop reordering (a dedicated drag handle, not the whole row, so typing/tapping in the fields doesn't fight with dragging) and support "Enter adds a new entry and focuses it, Shift+Enter inserts a line break" via [src/lib/use-editable-rows.ts](src/lib/use-editable-rows.ts), shared by [EditableList.tsx](src/components/fields/EditableList.tsx) (steps/variations) and [IngredientFields.tsx](src/components/fields/IngredientFields.tsx) (ingredients, including per-group reordering).
- **Shared state** — [src/lib/recipes-context.tsx](src/lib/recipes-context.tsx) loads recipes once via the repository and exposes them (plus create/edit/delete) to every page through React context. A future feature (e.g. a meal-planning calendar) can read from the same context.
- **Pages** — `/` (list + search), `/recipe/?id=` (detail), `/recipe/new/` (add), `/recipe/edit/?id=` (edit). Recipe identity is passed via a query string rather than a dynamic route segment (`/recipe/[id]`) because this app is a static export with client-generated IDs — see note below.
- **PWA** — [public/manifest.webmanifest](public/manifest.webmanifest) + [public/sw.js](public/sw.js) (hand-written service worker, no build plugin). The service worker precaches the app shell and its assets on install and applies cache-first/stale-while-revalidate/network-first strategies at runtime, so previously-visited pages keep working offline. Icons are in `public/icons/` (simple placeholders — swap them for a real logo whenever).

### Why static export (`output: "export"` in [next.config.ts](next.config.ts))

Every page is a client component talking directly to Supabase's hosted API (auth + REST) over plain `fetch` — there's no Next.js server involved, so there's nothing for a Node server to render. Static export turns the whole app into a small, fixed set of HTML/JS/CSS files, which makes the service worker's job simple and reliable (it can precache "the app," full stop, rather than guessing which of an unbounded number of server-rendered routes to cache). Auth state and data now live in Supabase rather than only in the browser, but the mechanism is unchanged: it's still all client-side fetches, so static export still fits. If server-side rendering or API routes are ever needed, drop `output: "export"` from `next.config.ts` — the repository pattern means the UI doesn't change either way.

### Environment variables

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.local.example`) must be `NEXT_PUBLIC_`-prefixed so Next.js inlines them into the browser bundle at build time — there's no server to keep them secret on. This is expected: the anon key is meant to be exposed to the browser, and the [Row Level Security policies](supabase/schema.sql) are what actually keep one user's recipes from another's, not keeping this key hidden.

## Adding new features

The recipes context and repository pattern are meant to support features like a meal-planning calendar without reworking existing code: add a new `MealPlan` type/repository following the same pattern, and a new set of pages under `src/app/`.
