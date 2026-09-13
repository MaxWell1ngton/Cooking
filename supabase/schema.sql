/*
  Run this in the Supabase SQL editor (Project -> SQL Editor -> New query).
  Mirrors src/types/recipe.ts's Recipe shape, one row per recipe, scoped to
  its owner via user_id + Row Level Security.

  Safe to run again later (e.g. after pulling an update that adds more to
  this file): every create table/index/column uses IF NOT EXISTS, the
  bucket insert upserts, and every policy is dropped before being
  recreated, since Postgres has no CREATE POLICY IF NOT EXISTS.
*/

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  ingredients jsonb not null default '[]'::jsonb,       /* Ingredient[] */
  ingredient_groups jsonb not null default '[]'::jsonb, /* IngredientGroup[] */
  steps jsonb not null default '[]'::jsonb,             /* string[] */
  variations jsonb not null default '[]'::jsonb,        /* string[] */
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_user_id_idx on public.recipes (user_id);

alter table public.recipes enable row level security;

/*
  Each policy is scoped to auth.uid() = user_id, so a signed-in user can
  only ever see, create, edit, or delete their own recipes - the anon key
  shipped to the browser has no broader access than this.
*/

drop policy if exists "Users can view their own recipes" on public.recipes;
create policy "Users can view their own recipes"
  on public.recipes for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own recipes" on public.recipes;
create policy "Users can insert their own recipes"
  on public.recipes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own recipes" on public.recipes;
create policy "Users can update their own recipes"
  on public.recipes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own recipes" on public.recipes;
create policy "Users can delete their own recipes"
  on public.recipes for delete
  using (auth.uid() = user_id);

/*
  Photos.
  image_path stores a Storage object path (e.g. "<user_id>/<random>.jpg"),
  not a public URL - the bucket below is private, so the app resolves a
  short-lived signed URL from this path each time a recipe is displayed
  (see src/lib/supabase/recipe-images.ts). Existing rows get NULL, which
  the app already treats as "no photo".
*/
alter table public.recipes add column if not exists image_path text;

/*
  Tags: replaces the earlier single `category` column with a multi-value
  jsonb array (string[]), matching how steps/variations are already stored.
  Free-text rather than an enum/check constraint, so the app's own preset
  quick-pick list (src/lib/recipe-tags.ts) can change without a migration.
  The block below is wrapped so it's safe to run again later: it only
  backfills/drops `category` while that column still exists, rather than
  erroring out on a second run once it's already gone.
*/
alter table public.recipes add column if not exists tags jsonb not null default '[]'::jsonb;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'recipes' and column_name = 'category'
  ) then
    update public.recipes
    set tags = jsonb_build_array(category)
    where category is not null and tags = '[]'::jsonb;

    alter table public.recipes drop column category;
  end if;
end $$;

/*
  A private bucket: objects aren't publicly listable or fetchable by URL
  alone, matching the same per-user RLS model as the recipes table above
  rather than "anyone with the link can view it forever". file_size_limit
  is a server-side backstop behind the client-side compression in
  src/lib/image-compression.ts, not the primary size control.
*/
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-images', 'recipe-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

/*
  storage.objects is a Supabase-managed table your SQL editor role doesn't
  own, so it can't be ALTERed here - but that's fine, since Supabase already
  has RLS enabled on it by default (Storage requires it to function). Only
  the policies below need to be added.

  Objects are uploaded to "<user_id>/<filename>" (see uploadRecipeImage in
  recipe-images.ts), so the first path segment is the owning user's id -
  the same ownership check the storage.foldername() helper exists for.
*/
drop policy if exists "Users can view their own recipe images" on storage.objects;
create policy "Users can view their own recipe images"
  on storage.objects for select
  using (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload their own recipe images" on storage.objects;
create policy "Users can upload their own recipe images"
  on storage.objects for insert
  with check (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own recipe images" on storage.objects;
create policy "Users can update their own recipe images"
  on storage.objects for update
  using (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own recipe images" on storage.objects;
create policy "Users can delete their own recipe images"
  on storage.objects for delete
  using (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = auth.uid()::text);
