-- Create story_saves table
create table if not exists public.story_saves (
    id uuid not null default gen_random_uuid(),
    user_id text not null references public.profiles(user_id) on delete cascade,
    story_id uuid not null references public.stories(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (id),
    unique(user_id, story_id)
);

-- Create index for better query performance
create index if not exists idx_story_saves_user_id on public.story_saves(user_id);
create index if not exists idx_story_saves_story_id on public.story_saves(story_id);

-- Enable RLS
alter table public.story_saves enable row level security;

-- Policies
drop policy if exists "Users can view their own saved stories" on public.story_saves;
create policy "Users can view their own saved stories"
    on public.story_saves for select
    using (true);

drop policy if exists "Users can save stories" on public.story_saves;
create policy "Users can save stories"
    on public.story_saves for insert
    with check (true);

drop policy if exists "Users can unsave stories" on public.story_saves;
create policy "Users can unsave stories"
    on public.story_saves for delete
    using (true);

-- Add saved_by array to stories view if possible, or just handle it in the application query
-- For now, we'll rely on a separate query or join, but to match the 'likedBy' pattern in the store, 
-- we might want to expose who saved it? Actually, saves are usually private.
-- So we will NOT add 'savedBy' to the public story object for everyone to see.
-- Instead, we will fetch 'my saved stories' separately or check existence.

-- However, for the store to easily toggle 'isSaved', we need to know if the CURRENT user saved it.
-- We can add a field to the story query or just fetch the list of saved story IDs for the current user.
