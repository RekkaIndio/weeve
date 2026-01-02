-- Create group_messages table
create table "public"."group_messages" (
    "id" uuid not null default gen_random_uuid(),
    "group_id" uuid not null references "public"."groups" ("id") on delete cascade,
    "sender_id" text not null references "public"."profiles" ("user_id") on delete cascade,
    "content" text not null,
    "created_at" timestamp with time zone not null default now(),
    primary key ("id")
);

-- Enable RLS
alter table "public"."group_messages" enable row level security;

-- Create policies

-- Allow viewing messages if you are a member of the group
create policy "View messages"
on "public"."group_messages"
as permissive
for select
to authenticated
using (
    exists (
        select 1 from "public"."group_members"
        where "group_members"."group_id" = "group_messages"."group_id"
        and "group_members"."user_id" = auth.uid()::text
        and "group_members"."status" = 'active'
    )
);

-- Allow inserting messages if you are a member of the group
create policy "Send messages"
on "public"."group_messages"
as permissive
for insert
to authenticated
with check (
    exists (
        select 1 from "public"."group_members"
        where "group_members"."group_id" = "group_messages"."group_id"
        and "group_members"."user_id" = auth.uid()::text
        and "group_members"."status" = 'active'
    )
);

-- Add real-time publication
alter publication supabase_realtime add table group_messages;
