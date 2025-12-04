-- Allow drawings as a contribution media type
ALTER TABLE contributions
  DROP CONSTRAINT IF EXISTS contributions_media_type_check;

ALTER TABLE contributions
  ADD CONSTRAINT contributions_media_type_check
    CHECK (media_type IN ('video', 'image', 'text', 'drawing'));
