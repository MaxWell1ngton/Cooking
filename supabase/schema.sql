-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Mirrors src/types/recipe.ts's Recipe shape, one row per recipe, scoped to
-- its owner via user_id + Row Level Security.

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  ingredients jsonb not null default '[]'::jsonb,       -- Ingredient[]
  ingredient_groups jsonb not null default '[]'::jsonb, -- IngredientGroup[]
  steps jsonb not null default '[]'::jsonb,             -- string[]
  variations jsonb not null default '[]'::jsonb,        -- string[]
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_user_id_idx on public.recipes (user_id);

alter table public.recipes enable row level security;

-- Each policy is scoped to auth.uid() = user_id, so a signed-in user can
-- only ever see, create, edit, or delete their own recipes — the anon key
-- shipped to the browser has no broader access than this.

create policy "Users can view their own recipes"
  on public.recipes for select
  using (auth.uid() = user_id);

create policy "Users can insert their own recipes"
  on public.recipes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own recipes"
  on public.recipes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own recipes"
  on public.recipes for delete
  using (auth.uid() = user_id);
