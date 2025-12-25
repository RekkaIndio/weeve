-- Brand Product Links Migration
-- Allows brands to add product URLs to their Canon and Seed posts
-- The story title becomes a clickable link to the product

-- Add product_url column to stories table
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS product_url TEXT;

-- Add index for efficient querying of stories with product links
CREATE INDEX IF NOT EXISTS idx_stories_product_url 
  ON stories(product_url) 
  WHERE product_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN stories.product_url IS 'Optional product URL for brand posts - makes the story title clickable';
