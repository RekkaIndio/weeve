-- Create the hashtags table
create table if not exists hashtags (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  count int default 0,
  last_used_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Create an index for fast searching
create index if not exists hashtags_name_idx on hashtags using btree (name);
create index if not exists hashtags_count_idx on hashtags (count desc);

-- Function to sync hashtags from stories
create or replace function public.sync_hashtags()
returns trigger as $$
declare
  tag text;
  old_tags text[];
  new_tags text[];
begin
  -- Handle Insert
  if (TG_OP = 'INSERT') then
    if NEW.hashtags is not null then
      foreach tag in array NEW.hashtags
      loop
        insert into hashtags (name, count, last_used_at)
        values (tag, 1, now())
        on conflict (name) do update
        set count = hashtags.count + 1,
            last_used_at = now();
      end loop;
    end if;
    return NEW;
  end if;

  -- Handle Delete
  if (TG_OP = 'DELETE') then
    if OLD.hashtags is not null then
      foreach tag in array OLD.hashtags
      loop
        update hashtags
        set count = count - 1
        where name = tag;
      end loop;
      
      -- Optional: Delete tags that reached 0 count to keep table clean?
      -- OR keep them for history. Let's keep them but with 0 count for now.
    end if;
    return OLD;
  end if;

  -- Handle Update
  if (TG_OP = 'UPDATE') then
    old_tags := coalesce(OLD.hashtags, array[]::text[]);
    new_tags := coalesce(NEW.hashtags, array[]::text[]);
    
    -- If hashtags haven't changed, do nothing
    if old_tags = new_tags then
      return NEW;
    end if;

    -- Decrement removed tags
    foreach tag in array old_tags
    loop
      if not (tag = any(new_tags)) then
        update hashtags
        set count = count - 1
        where name = tag;
      end if;
    end loop;

    -- Increment added tags
    foreach tag in array new_tags
    loop
      if not (tag = any(old_tags)) then
        insert into hashtags (name, count, last_used_at)
        values (tag, 1, now())
        on conflict (name) do update
        set count = hashtags.count + 1,
            last_used_at = now();
      end if;
    end loop;

    return NEW;
  end if;

  return null;
end;
$$ language plpgsql security definer;

-- Create the trigger
drop trigger if exists on_story_hashtags_change on stories;
create trigger on_story_hashtags_change
  after insert or update of hashtags or delete
  on stories
  for each row
  execute function public.sync_hashtags();

-- Backfill existing hashtags (Run this once)
-- We use a temporary logic to populate the table from existing stories
do $$
declare
  story_record record;
  tag text;
begin
  -- Clear existing counts just in case we are re-running on a fresh table
  -- delete from hashtags; 
  
  for story_record in select hashtags from stories where hashtags is not null
  loop
    foreach tag in array story_record.hashtags
    loop
      insert into hashtags (name, count, last_used_at)
      values (tag, 1, now())
      on conflict (name) do update
      set count = hashtags.count + 1;
    end loop;
  end loop;
end;
$$;
