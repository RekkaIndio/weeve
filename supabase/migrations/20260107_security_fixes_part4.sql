-- Security Advisor Fixes Part 4 - Final Fixes
-- Fixes last remaining function search path warnings and profiles UPDATE policy

-- ============================================================================
-- 1. DROP AND RECREATE transfer_tokens WITH search_path
-- (There are multiple versions from different migrations)
-- ============================================================================

DROP FUNCTION IF EXISTS transfer_tokens(TEXT, TEXT, INTEGER, TEXT, JSONB);

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
    SET tokens = tokens + p_token_amount,
        earned_tokens = earned_tokens + p_token_amount,
        total_earned = total_earned + p_token_amount,
        updated_at = NOW()
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

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION transfer_tokens(TEXT, TEXT, INTEGER, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_tokens(TEXT, TEXT, INTEGER, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION transfer_tokens(TEXT, TEXT, INTEGER, TEXT, JSONB) TO service_role;

-- ============================================================================
-- 2. DROP AND RECREATE add_tokens WITH search_path
-- ============================================================================

DROP FUNCTION IF EXISTS add_tokens(TEXT, INTEGER, TEXT, JSONB);

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

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION add_tokens(TEXT, INTEGER, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION add_tokens(TEXT, INTEGER, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION add_tokens(TEXT, INTEGER, TEXT, JSONB) TO service_role;

-- ============================================================================
-- 3. CREATE deduct_tokens WITH search_path (if it exists)
-- ============================================================================

-- Try to get existing definition and recreate with search_path
DO $$
BEGIN
  -- Only create if function exists (it may have been created elsewhere)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'deduct_tokens') THEN
    EXECUTE 'DROP FUNCTION IF EXISTS deduct_tokens(TEXT, INTEGER, TEXT, JSONB)';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION deduct_tokens(
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
    v_balance INTEGER;
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

    SELECT tokens INTO v_balance FROM profiles WHERE user_id = p_user_id FOR UPDATE;

    IF v_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;

    IF v_balance < p_token_amount THEN
        RAISE EXCEPTION 'Insufficient balance. Has: %, Needs: %', v_balance, p_token_amount;
    END IF;

    UPDATE profiles 
    SET tokens = tokens - p_token_amount, updated_at = NOW()
    WHERE user_id = p_user_id;

    SELECT tokens INTO v_new_balance FROM profiles WHERE user_id = p_user_id;

    INSERT INTO token_transactions (
        from_user_id, amount, transaction_type, status, reference_id, metadata
    ) VALUES (
        p_user_id, p_token_amount, 'transfer', 'completed', p_reference_id, p_metadata
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
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION deduct_tokens(TEXT, INTEGER, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_tokens(TEXT, INTEGER, TEXT, JSONB) TO service_role;

-- ============================================================================
-- 4. FIX contribution_needs_approval (recreate as TRIGGER function)
-- ============================================================================

DROP FUNCTION IF EXISTS contribution_needs_approval() CASCADE;

CREATE OR REPLACE FUNCTION contribution_needs_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_story stories%ROWTYPE;
BEGIN
  SELECT * INTO v_story FROM stories WHERE id = NEW.story_id;
  
  IF v_story.brand_id IS NOT NULL AND v_story.post_type IN ('canon', 'seed') THEN
    NEW.approval_status := 'pending';
  ELSE
    NEW.approval_status := 'approved';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS contribution_needs_approval_trigger ON contributions;
CREATE TRIGGER contribution_needs_approval_trigger
  BEFORE INSERT ON contributions
  FOR EACH ROW
  EXECUTE FUNCTION contribution_needs_approval();

-- ============================================================================
-- 5. FIX profiles UPDATE policy
-- ============================================================================

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- ============================================================================
-- DONE
-- ============================================================================
