-- Fix story_saves table to use text user_id instead of uuid
-- This script will drop and recreate the table with the correct schema

-- Drop existing table and policies
drop table if exists public.story_saves cascade;

-- Create story_saves table with correct schema
create table public.story_saves (
    id uuid not null default gen_random_uuid(),
    user_id text not null references public.profiles(user_id) on delete cascade,
    story_id uuid not null references public.stories(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (id),
    unique(user_id, story_id)
);

-- Create indexes for better query performance
create index idx_story_saves_user_id on public.story_saves(user_id);
create index idx_story_saves_story_id on public.story_saves(story_id);

-- Enable RLS
alter table public.story_saves enable row level security;

-- Policies (using 'true' for now to match other tables in your schema)
create policy "Users can view their own saved stories"
    on public.story_saves for select
    using (true);

create policy "Users can save stories"
    on public.story_saves for insert
    with check (true);

create policy "Users can unsave stories"
    on public.story_saves for delete
    using (true);
