-- Increase file size limit for story-media bucket to 100MB
UPDATE storage.buckets
SET file_size_limit = 104857600
WHERE id = 'story-media';
