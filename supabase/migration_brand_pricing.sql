-- Brand Pricing Migration
-- Defines pricing tiers for Canon and Seed brand posts

-- ============================================================================
-- BRAND_PRICING TABLE
-- ============================================================================

-- Create table to store brand pricing tiers
CREATE TABLE IF NOT EXISTS brand_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_type TEXT NOT NULL CHECK (post_type IN ('canon', 'seed')),
  slot_count INTEGER NOT NULL CHECK (slot_count > 0),
  price_gbp DECIMAL(10, 2) NOT NULL CHECK (price_gbp >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_type, slot_count)
);

-- Create index for efficient pricing lookups
CREATE INDEX IF NOT EXISTS idx_brand_pricing_lookup ON brand_pricing(post_type, slot_count);

-- ============================================================================
-- SEED PRICING TIERS (Standard - Half of Canon)
-- ============================================================================

INSERT INTO brand_pricing (post_type, slot_count, price_gbp) VALUES
  ('seed', 1, 50.00),
  ('seed', 3, 150.00),
  ('seed', 7, 350.00),
  ('seed', 14, 700.00)
ON CONFLICT (post_type, slot_count) DO UPDATE SET
  price_gbp = EXCLUDED.price_gbp,
  updated_at = NOW();

-- ============================================================================
-- CANON PRICING TIERS (Premium - Double Seed)
-- ============================================================================

INSERT INTO brand_pricing (post_type, slot_count, price_gbp) VALUES
  ('canon', 1, 100.00),
  ('canon', 3, 300.00),
  ('canon', 7, 700.00),
  ('canon', 14, 1400.00)
ON CONFLICT (post_type, slot_count) DO UPDATE SET
  price_gbp = EXCLUDED.price_gbp,
  updated_at = NOW();

-- ============================================================================
-- HELPER FUNCTION: Get Brand Pricing
-- ============================================================================

CREATE OR REPLACE FUNCTION get_brand_pricing(
  p_post_type TEXT,
  p_slot_count INTEGER
) RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_price DECIMAL(10, 2);
BEGIN
  -- Get exact price for the slot count
  SELECT price_gbp INTO v_price
  FROM brand_pricing
  WHERE post_type = p_post_type AND slot_count = p_slot_count;
  
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'No pricing found for % with % slots', p_post_type, p_slot_count;
  END IF;
  
  RETURN v_price;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Get All Pricing for Post Type
-- ============================================================================

CREATE OR REPLACE FUNCTION get_all_brand_pricing(p_post_type TEXT)
RETURNS TABLE (
  slot_count INTEGER,
  price_gbp DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT bp.slot_count, bp.price_gbp
  FROM brand_pricing bp
  WHERE bp.post_type = p_post_type
  ORDER BY bp.slot_count ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE brand_pricing IS 'Pricing tiers for brand posts (Canon and Seed)';
COMMENT ON COLUMN brand_pricing.post_type IS 'Type of brand post: canon or seed';
COMMENT ON COLUMN brand_pricing.slot_count IS 'Number of slots in the story';
COMMENT ON COLUMN brand_pricing.price_gbp IS 'Price in GBP for this tier';

COMMENT ON FUNCTION get_brand_pricing(TEXT, INTEGER) IS 'Get the price for a specific post type and slot count';
COMMENT ON FUNCTION get_all_brand_pricing(TEXT) IS 'Get all pricing tiers for a specific post type';
