-- Add featured and scheduled options for stories (brand features)
alter table stories
add column is_featured boolean default false,
add column scheduled_for timestamp with time zone default null;

-- Add index for efficient querying of scheduled posts
create index on stories (scheduled_for);
create index on stories (is_featured);
