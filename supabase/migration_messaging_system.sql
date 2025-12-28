-- Create conversations table
create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_message_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_message_preview text
);

-- Create conversation_participants table
create table if not exists conversation_participants (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade not null,
  user_id text references profiles(user_id) on delete cascade not null,
  last_read_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(conversation_id, user_id)
);

-- Create messages table
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender_id text references profiles(user_id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_read boolean default false
);

-- Enable RLS
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;

-- Policies for conversations
-- Users can view conversations they are part of
create policy "Users can view their own conversations"
  on conversations for select
  using (
    exists (
      select 1 from conversation_participants
      where conversation_id = conversations.id
      and user_id = auth.uid()::text
    )
  );

-- Policies for conversation_participants
-- Users can view participants of conversations they are in
create policy "Users can view participants of their conversations"
  on conversation_participants for select
  using (
    exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
      and cp.user_id = auth.uid()::text
    )
  );

-- Users can insert themselves as participants (e.g., when accepting an invite or starting a chat - though strictly speaking this might be too open, usually we handle this via functions, but for now simple RLS)
-- Actually, specific logic: when creating a conversation, one might insert participants. 
-- Let's stick to: Users can see rows where they are the user_id OR where they are in the same conversation.
create policy "Users can view conversation participants"
  on conversation_participants for select
  using (
    user_id = auth.uid()::text or
    exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
      and cp.user_id = auth.uid()::text
    )
  );

-- Policies for messages
-- Users can view messages in conversations they belong to
create policy "Users can view messages in their conversations"
  on messages for select
  using (
    exists (
      select 1 from conversation_participants
      where conversation_id = messages.conversation_id
      and user_id = auth.uid()::text
    )
  );

-- Users can insert messages if they are in the conversation
create policy "Users can insert messages in their conversations"
  on messages for insert
  with check (
    auth.uid()::text = sender_id and
    exists (
      select 1 from conversation_participants
      where conversation_id = messages.conversation_id
      and user_id = auth.uid()::text
    )
  );
