-- Security Advisor Fixes Part 2
-- Fixes function search path warnings and overly permissive RLS policies

-- ============================================================================
-- 1. FIX FUNCTION SEARCH PATHS
-- Add SET search_path = public to prevent search path attacks
-- ============================================================================

-- Note: We need to recreate functions with the search_path setting.
-- For simplicity, we'll use ALTER FUNCTION where possible.

-- ----------------------------------------------------------------------------
-- High Priority - SECURITY DEFINER functions
-- ----------------------------------------------------------------------------

-- transfer_tokens (from migration_token_transactions.sql)
CREATE OR REPLACE FUNCTION transfer_tokens(
    p_from_user_id TEXT,
    p_to_user_id TEXT,
    p_token_amount INTEGER,
    p_reference_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_from_balance INTEGER;
    v_to_balance INTEGER;
    v_new_from_balance INTEGER;
    v_new_to_balance INTEGER;
    v_transaction_id UUID;
    v_result json;
BEGIN
    IF p_from_user_id IS NULL OR p_to_user_id IS NULL THEN
        RAISE EXCEPTION 'User IDs cannot be null';
    END IF;
    
    IF p_token_amount <= 0 THEN
        RAISE EXCEPTION 'Token amount must be positive';
    END IF;

    IF p_from_user_id < p_to_user_id THEN
        SELECT tokens INTO v_from_balance FROM profiles WHERE user_id = p_from_user_id FOR UPDATE;
        SELECT tokens INTO v_to_balance FROM profiles WHERE user_id = p_to_user_id FOR UPDATE;
    ELSE
        SELECT tokens INTO v_to_balance FROM profiles WHERE user_id = p_to_user_id FOR UPDATE;
        SELECT tokens INTO v_from_balance FROM profiles WHERE user_id = p_from_user_id FOR UPDATE;
    END IF;

    IF v_from_balance IS NULL THEN
        RAISE EXCEPTION 'Sender not found: %', p_from_user_id;
    END IF;
    
    IF v_to_balance IS NULL THEN
        RAISE EXCEPTION 'Recipient not found: %', p_to_user_id;
    END IF;

    IF v_from_balance < p_token_amount THEN
        RAISE EXCEPTION 'Insufficient balance. Has: %, Needs: %', v_from_balance, p_token_amount;
    END IF;

    UPDATE profiles 
    SET tokens = tokens - p_token_amount, updated_at = NOW()
    WHERE user_id = p_from_user_id;

    UPDATE profiles 
    SET tokens = tokens + p_token_amount, updated_at = NOW()
    WHERE user_id = p_to_user_id;

    SELECT tokens INTO v_new_from_balance FROM profiles WHERE user_id = p_from_user_id;
    SELECT tokens INTO v_new_to_balance FROM profiles WHERE user_id = p_to_user_id;

    INSERT INTO token_transactions (
        from_user_id, to_user_id, amount, transaction_type, status, reference_id, metadata
    ) VALUES (
        p_from_user_id, p_to_user_id, p_token_amount, 'transfer', 'completed', p_reference_id, p_metadata
    ) RETURNING id INTO v_transaction_id;

    v_result := json_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'from_user_id', p_from_user_id,
        'to_user_id', p_to_user_id,
        'amount', p_token_amount,
        'from_balance', v_new_from_balance,
        'to_balance', v_new_to_balance
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    INSERT INTO token_transactions (
        from_user_id, to_user_id, amount, transaction_type, status, reference_id, metadata, error_message
    ) VALUES (
        p_from_user_id, p_to_user_id, p_token_amount, 'transfer', 'failed', p_reference_id, p_metadata, SQLERRM
    );
    RAISE;
END;
$$;

-- add_tokens (from migration_token_transactions.sql)
CREATE OR REPLACE FUNCTION add_tokens(
    p_user_id TEXT,
    p_token_amount INTEGER,
    p_reference_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_balance INTEGER;
    v_transaction_id UUID;
    v_result json;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF p_token_amount <= 0 THEN
        RAISE EXCEPTION 'Token amount must be positive';
    END IF;

    SELECT tokens INTO v_new_balance FROM profiles WHERE user_id = p_user_id FOR UPDATE;

    IF v_new_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;

    UPDATE profiles 
    SET tokens = tokens + p_token_amount, updated_at = NOW()
    WHERE user_id = p_user_id;

    SELECT tokens INTO v_new_balance FROM profiles WHERE user_id = p_user_id;

    INSERT INTO token_transactions (
        to_user_id, amount, transaction_type, status, reference_id, metadata
    ) VALUES (
        p_user_id, p_token_amount, 'purchase', 'completed', p_reference_id, p_metadata
    ) RETURNING id INTO v_transaction_id;

    v_result := json_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'user_id', p_user_id,
        'amount', p_token_amount,
        'new_balance', v_new_balance
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    INSERT INTO token_transactions (
        to_user_id, amount, transaction_type, status, reference_id, metadata, error_message
    ) VALUES (
        p_user_id, p_token_amount, 'purchase', 'failed', p_reference_id, p_metadata, SQLERRM
    );
    RAISE;
END;
$$;

-- sync_hashtags (from migration_hashtags_trigger.sql)
CREATE OR REPLACE FUNCTION public.sync_hashtags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tag text;
  old_tags text[];
  new_tags text[];
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.hashtags IS NOT NULL THEN
      FOREACH tag IN ARRAY NEW.hashtags
      LOOP
        INSERT INTO hashtags (name, count, last_used_at)
        VALUES (tag, 1, now())
        ON CONFLICT (name) DO UPDATE
        SET count = hashtags.count + 1, last_used_at = now();
      END LOOP;
    END IF;
    RETURN NEW;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    IF OLD.hashtags IS NOT NULL THEN
      FOREACH tag IN ARRAY OLD.hashtags
      LOOP
        UPDATE hashtags SET count = count - 1 WHERE name = tag;
      END LOOP;
    END IF;
    RETURN OLD;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    old_tags := COALESCE(OLD.hashtags, ARRAY[]::text[]);
    new_tags := COALESCE(NEW.hashtags, ARRAY[]::text[]);
    
    IF old_tags = new_tags THEN
      RETURN NEW;
    END IF;

    FOREACH tag IN ARRAY old_tags
    LOOP
      IF NOT (tag = ANY(new_tags)) THEN
        UPDATE hashtags SET count = count - 1 WHERE name = tag;
      END IF;
    END LOOP;

    FOREACH tag IN ARRAY new_tags
    LOOP
      IF NOT (tag = ANY(old_tags)) THEN
        INSERT INTO hashtags (name, count, last_used_at)
        VALUES (tag, 1, now())
        ON CONFLICT (name) DO UPDATE
        SET count = hashtags.count + 1, last_used_at = now();
      END IF;
    END LOOP;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- ----------------------------------------------------------------------------
-- Medium Priority - Other functions with search_path fix
-- Using ALTER FUNCTION where function signature allows
-- ----------------------------------------------------------------------------

-- Verification system functions
CREATE OR REPLACE FUNCTION calculate_engagement_ratio(p_user_id TEXT)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  positive_count INTEGER;
  negative_count INTEGER;
  ratio DECIMAL(5,2);
BEGIN
  SELECT COALESCE(
    (SELECT COUNT(*) FROM story_likes sl JOIN stories s ON sl.story_id = s.id WHERE s.creator_id = p_user_id)
    + (SELECT COUNT(*) FROM story_comments sc JOIN stories s ON sc.story_id = s.id WHERE s.creator_id = p_user_id),
    0
  ) INTO positive_count;
  
  negative_count := 0;
  
  IF (positive_count + negative_count) = 0 THEN
    RETURN 1.0;
  END IF;
  
  ratio := positive_count::DECIMAL / (positive_count + negative_count);
  RETURN LEAST(ratio, 1.0);
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_story_contribution_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  max_limit INTEGER;
  existing_count INTEGER;
BEGIN
  SELECT max_weeves INTO max_limit FROM stories WHERE id = NEW.story_id;

  IF max_limit IS NULL OR max_limit <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO existing_count FROM contributions WHERE story_id = NEW.story_id;

  IF existing_count >= max_limit THEN
    RAISE EXCEPTION 'Contribution limit reached for this story';
  END IF;

  IF existing_count + 1 = max_limit THEN
    UPDATE stories
    SET status = 'completed', current_turn_user_id = NULL, updated_at = NOW()
    WHERE id = NEW.story_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Brand pricing functions
CREATE OR REPLACE FUNCTION get_brand_pricing(p_post_type TEXT, p_slot_count INTEGER)
RETURNS DECIMAL(10, 2)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_price DECIMAL(10, 2);
BEGIN
  SELECT price_gbp INTO v_price
  FROM brand_pricing
  WHERE post_type = p_post_type AND slot_count = p_slot_count;
  
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'No pricing found for % with % slots', p_post_type, p_slot_count;
  END IF;
  
  RETURN v_price;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_brand_pricing(p_post_type TEXT)
RETURNS TABLE (slot_count INTEGER, price_gbp DECIMAL(10, 2))
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT bp.slot_count, bp.price_gbp
  FROM brand_pricing bp
  WHERE bp.post_type = p_post_type
  ORDER BY bp.slot_count ASC;
END;
$$;

-- Handle new notification
CREATE OR REPLACE FUNCTION handle_new_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Trigger logic for push notifications if implemented
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. TIGHTEN RLS POLICIES
-- Replace overly permissive USING (true) with proper checks
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Stories table - only creators can update/delete
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Stories can be updated by anyone" ON stories;
CREATE POLICY "Creators and participants can update stories" ON stories
  FOR UPDATE
  USING (
    creator_id = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM story_participants 
      WHERE story_id = stories.id AND user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Creators can delete their stories" ON stories;
CREATE POLICY "Creators can delete their stories" ON stories
  FOR DELETE
  USING (creator_id = auth.uid()::text);

-- ----------------------------------------------------------------------------
-- Friendships table - users can only manage their own
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
CREATE POLICY "Users can create friendships" ON friendships
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their friendships" ON friendships;
CREATE POLICY "Users can delete their friendships" ON friendships
  FOR DELETE
  USING (user_id = auth.uid()::text OR friend_id = auth.uid()::text);

-- ----------------------------------------------------------------------------
-- Story saves table - users can only manage their own
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can save stories" ON story_saves;
CREATE POLICY "Users can save stories" ON story_saves
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can unsave stories" ON story_saves;
CREATE POLICY "Users can unsave stories" ON story_saves
  FOR DELETE
  USING (user_id = auth.uid()::text);

-- ----------------------------------------------------------------------------
-- Groups table - already has proper owner check, just fixing the update policy
-- The "Groups can be updated" policy with USING (true) needs to be replaced
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Groups can be updated" ON groups;
-- Note: Keep the existing "Groups can be updated by owner" policy which is correct

-- ----------------------------------------------------------------------------
-- Token transactions - tighten insert policy
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "System can insert transactions" ON token_transactions;
CREATE POLICY "Authenticated users can insert transactions" ON token_transactions
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- DONE
-- ============================================================================
