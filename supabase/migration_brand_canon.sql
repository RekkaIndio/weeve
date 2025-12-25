-- Add post_type and canon_slots for Brand features
alter table stories
add column post_type text check (post_type in ('normal', 'canon', 'seed')) default 'normal',
add column canon_slots integer[] default null;

-- Add index for filtering
create index on stories (post_type);
