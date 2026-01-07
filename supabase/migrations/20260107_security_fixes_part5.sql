-- Security Advisor Fixes Part 5 - Final Function Signature Fixes
-- These functions have different signatures than what Part 4 covered

-- ============================================================================
-- 1. contribution_needs_approval(UUID) - helper function, NOT trigger
-- ============================================================================

DROP FUNCTION IF EXISTS contribution_needs_approval(UUID);

CREATE OR REPLACE FUNCTION contribution_needs_approval(p_story_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_post_type TEXT;
BEGIN
  SELECT post_type INTO v_post_type
  FROM stories
  WHERE id = p_story_id;
  
  RETURN v_post_type IN ('canon', 'seed');
END;
$$;

-- ============================================================================
-- 2. List ALL token function signatures and recreate with search_path
-- Using pg_catalog to find exact signatures
-- ============================================================================

-- First, drop ALL versions of these functions to start fresh
DO $$
DECLARE
  func_oid oid;
BEGIN
  -- Drop all versions of add_tokens
  FOR func_oid IN 
    SELECT p.oid FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'add_tokens'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_oid::regprocedure || ' CASCADE';
  END LOOP;
  
  -- Drop all versions of transfer_tokens
  FOR func_oid IN 
    SELECT p.oid FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'transfer_tokens'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_oid::regprocedure || ' CASCADE';
  END LOOP;
  
  -- Drop all versions of deduct_tokens
  FOR func_oid IN 
    SELECT p.oid FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'deduct_tokens'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_oid::regprocedure || ' CASCADE';
  END LOOP;
END $$;

-- ============================================================================
-- 3. Recreate transfer_tokens with SET search_path
-- ============================================================================

CREATE FUNCTION transfer_tokens(
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

    IF v_from_balance IS NULL THEN RAISE EXCEPTION 'Sender not found: %', p_from_user_id; END IF;
    IF v_to_balance IS NULL THEN RAISE EXCEPTION 'Recipient not found: %', p_to_user_id; END IF;
    IF v_from_balance < p_token_amount THEN RAISE EXCEPTION 'Insufficient balance. Has: %, Needs: %', v_from_balance, p_token_amount; END IF;

    UPDATE profiles SET tokens = tokens - p_token_amount, updated_at = NOW() WHERE user_id = p_from_user_id;
    UPDATE profiles SET tokens = tokens + p_token_amount, earned_tokens = earned_tokens + p_token_amount, total_earned = total_earned + p_token_amount, updated_at = NOW() WHERE user_id = p_to_user_id;

    SELECT tokens INTO v_new_from_balance FROM profiles WHERE user_id = p_from_user_id;
    SELECT tokens INTO v_new_to_balance FROM profiles WHERE user_id = p_to_user_id;

    INSERT INTO token_transactions (from_user_id, to_user_id, amount, transaction_type, status, reference_id, metadata)
    VALUES (p_from_user_id, p_to_user_id, p_token_amount, 'transfer', 'completed', p_reference_id, p_metadata)
    RETURNING id INTO v_transaction_id;

    RETURN json_build_object('success', true, 'transaction_id', v_transaction_id, 'from_user_id', p_from_user_id, 'to_user_id', p_to_user_id, 'amount', p_token_amount, 'from_balance', v_new_from_balance, 'to_balance', v_new_to_balance);
EXCEPTION WHEN OTHERS THEN
    INSERT INTO token_transactions (from_user_id, to_user_id, amount, transaction_type, status, reference_id, metadata, error_message)
    VALUES (p_from_user_id, p_to_user_id, p_token_amount, 'transfer', 'failed', p_reference_id, p_metadata, SQLERRM);
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION transfer_tokens(TEXT, TEXT, INTEGER, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_tokens(TEXT, TEXT, INTEGER, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION transfer_tokens(TEXT, TEXT, INTEGER, TEXT, JSONB) TO service_role;

-- ============================================================================
-- 4. Recreate add_tokens with SET search_path
-- ============================================================================

CREATE FUNCTION add_tokens(
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
BEGIN
    IF p_user_id IS NULL THEN RAISE EXCEPTION 'User ID cannot be null'; END IF;
    IF p_token_amount <= 0 THEN RAISE EXCEPTION 'Token amount must be positive'; END IF;

    SELECT tokens INTO v_new_balance FROM profiles WHERE user_id = p_user_id FOR UPDATE;
    IF v_new_balance IS NULL THEN RAISE EXCEPTION 'User not found: %', p_user_id; END IF;

    UPDATE profiles SET tokens = tokens + p_token_amount, updated_at = NOW() WHERE user_id = p_user_id;
    SELECT tokens INTO v_new_balance FROM profiles WHERE user_id = p_user_id;

    INSERT INTO token_transactions (to_user_id, amount, transaction_type, status, reference_id, metadata)
    VALUES (p_user_id, p_token_amount, 'purchase', 'completed', p_reference_id, p_metadata)
    RETURNING id INTO v_transaction_id;

    RETURN json_build_object('success', true, 'transaction_id', v_transaction_id, 'user_id', p_user_id, 'amount', p_token_amount, 'new_balance', v_new_balance);
EXCEPTION WHEN OTHERS THEN
    INSERT INTO token_transactions (to_user_id, amount, transaction_type, status, reference_id, metadata, error_message)
    VALUES (p_user_id, p_token_amount, 'purchase', 'failed', p_reference_id, p_metadata, SQLERRM);
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION add_tokens(TEXT, INTEGER, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION add_tokens(TEXT, INTEGER, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION add_tokens(TEXT, INTEGER, TEXT, JSONB) TO service_role;

-- ============================================================================
-- 5. Recreate deduct_tokens with SET search_path
-- ============================================================================

CREATE FUNCTION deduct_tokens(
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
BEGIN
    IF p_user_id IS NULL THEN RAISE EXCEPTION 'User ID cannot be null'; END IF;
    IF p_token_amount <= 0 THEN RAISE EXCEPTION 'Token amount must be positive'; END IF;

    SELECT tokens INTO v_balance FROM profiles WHERE user_id = p_user_id FOR UPDATE;
    IF v_balance IS NULL THEN RAISE EXCEPTION 'User not found: %', p_user_id; END IF;
    IF v_balance < p_token_amount THEN RAISE EXCEPTION 'Insufficient balance. Has: %, Needs: %', v_balance, p_token_amount; END IF;

    UPDATE profiles SET tokens = tokens - p_token_amount, updated_at = NOW() WHERE user_id = p_user_id;
    SELECT tokens INTO v_new_balance FROM profiles WHERE user_id = p_user_id;

    INSERT INTO token_transactions (from_user_id, amount, transaction_type, status, reference_id, metadata)
    VALUES (p_user_id, p_token_amount, 'transfer', 'completed', p_reference_id, p_metadata)
    RETURNING id INTO v_transaction_id;

    RETURN json_build_object('success', true, 'transaction_id', v_transaction_id, 'user_id', p_user_id, 'amount', p_token_amount, 'new_balance', v_new_balance);
EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION deduct_tokens(TEXT, INTEGER, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_tokens(TEXT, INTEGER, TEXT, JSONB) TO service_role;

-- ============================================================================
-- DONE - This should fix the last 4 function warnings!
-- ============================================================================
