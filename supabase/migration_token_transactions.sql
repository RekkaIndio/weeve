-- Token Transactions System Migration
-- This migration adds transaction logging and atomic transfer function

-- ================================================
-- 1. CREATE TOKEN TRANSACTIONS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS token_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id TEXT REFERENCES profiles(user_id) ON DELETE SET NULL,
    to_user_id TEXT REFERENCES profiles(user_id) ON DELETE SET NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('transfer', 'purchase', 'refund', 'admin')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'completed',
    reference_id TEXT, -- Stripe session ID, story contribution ID, etc.
    metadata JSONB, -- Additional context (story_id, contribution_id, etc.)
    error_message TEXT, -- Store error details if failed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_token_txn_from_user ON token_transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_token_txn_to_user ON token_transactions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_token_txn_reference ON token_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_token_txn_created ON token_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_txn_status ON token_transactions(status);
CREATE INDEX IF NOT EXISTS idx_token_txn_type ON token_transactions(transaction_type);

-- ================================================
-- 2. RLS POLICIES FOR TOKEN TRANSACTIONS
-- ================================================

ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their transactions" ON token_transactions;
CREATE POLICY "Users can view their transactions" ON token_transactions
    FOR SELECT USING (
        auth.uid()::text = from_user_id OR 
        auth.uid()::text = to_user_id
    );

-- Only system can insert transactions (via RPC)
DROP POLICY IF EXISTS "System can insert transactions" ON token_transactions;
CREATE POLICY "System can insert transactions" ON token_transactions
    FOR INSERT WITH CHECK (true);

-- ================================================
-- 3. ATOMIC TOKEN TRANSFER FUNCTION
-- ================================================

CREATE OR REPLACE FUNCTION transfer_tokens(
    p_from_user_id TEXT,
    p_to_user_id TEXT,
    p_token_amount INTEGER,
    p_reference_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to bypass RLS
AS $$
DECLARE
    v_from_balance INTEGER;
    v_to_balance INTEGER;
    v_new_from_balance INTEGER;
    v_new_to_balance INTEGER;
    v_transaction_id UUID;
    v_result json;
BEGIN
    -- Validate inputs
    IF p_from_user_id IS NULL OR p_to_user_id IS NULL THEN
        RAISE EXCEPTION 'User IDs cannot be null';
    END IF;
    
    IF p_token_amount <= 0 THEN
        RAISE EXCEPTION 'Token amount must be positive';
    END IF;

    -- Lock rows in consistent order to prevent deadlock
    -- Always lock in alphabetical order of user_id
    IF p_from_user_id < p_to_user_id THEN
        SELECT tokens INTO v_from_balance FROM profiles WHERE user_id = p_from_user_id FOR UPDATE;
        SELECT tokens INTO v_to_balance FROM profiles WHERE user_id = p_to_user_id FOR UPDATE;
    ELSE
        SELECT tokens INTO v_to_balance FROM profiles WHERE user_id = p_to_user_id FOR UPDATE;
        SELECT tokens INTO v_from_balance FROM profiles WHERE user_id = p_from_user_id FOR UPDATE;
    END IF;

    -- Validate that both users exist
    IF v_from_balance IS NULL THEN
        RAISE EXCEPTION 'Sender not found: %', p_from_user_id;
    END IF;
    
    IF v_to_balance IS NULL THEN
        RAISE EXCEPTION 'Recipient not found: %', p_to_user_id;
    END IF;

    -- Validate sufficient balance
    IF v_from_balance < p_token_amount THEN
        RAISE EXCEPTION 'Insufficient balance. Has: %, Needs: %', v_from_balance, p_token_amount;
    END IF;

    -- Perform the atomic transfer
    UPDATE profiles 
    SET tokens = tokens - p_token_amount,
        updated_at = NOW()
    WHERE user_id = p_from_user_id;

    UPDATE profiles 
    SET tokens = tokens + p_token_amount,
        updated_at = NOW()
    WHERE user_id = p_to_user_id;

    -- Get new balances
    SELECT tokens INTO v_new_from_balance FROM profiles WHERE user_id = p_from_user_id;
    SELECT tokens INTO v_new_to_balance FROM profiles WHERE user_id = p_to_user_id;

    -- Log the transaction
    INSERT INTO token_transactions (
        from_user_id,
        to_user_id,
        amount,
        transaction_type,
        status,
        reference_id,
        metadata
    ) VALUES (
        p_from_user_id,
        p_to_user_id,
        p_token_amount,
        'transfer',
        'completed',
        p_reference_id,
        p_metadata
    ) RETURNING id INTO v_transaction_id;

    -- Build success response
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
    -- Log failed transaction
    INSERT INTO token_transactions (
        from_user_id,
        to_user_id,
        amount,
        transaction_type,
        status,
        reference_id,
        metadata,
        error_message
    ) VALUES (
        p_from_user_id,
        p_to_user_id,
        p_token_amount,
        'transfer',
        'failed',
        p_reference_id,
        p_metadata,
        SQLERRM
    );
    
    -- Re-raise the exception
    RAISE;
END;
$$;

-- ================================================
-- 4. ADD TOKENS FUNCTION (for purchases)
-- ================================================

CREATE OR REPLACE FUNCTION add_tokens(
    p_user_id TEXT,
    p_token_amount INTEGER,
    p_reference_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_balance INTEGER;
    v_transaction_id UUID;
    v_result json;
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF p_token_amount <= 0 THEN
        RAISE EXCEPTION 'Token amount must be positive';
    END IF;

    -- Lock the user row
    SELECT tokens INTO v_new_balance FROM profiles WHERE user_id = p_user_id FOR UPDATE;

    -- Validate user exists
    IF v_new_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;

    -- Add tokens
    UPDATE profiles 
    SET tokens = tokens + p_token_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Get new balance
    SELECT tokens INTO v_new_balance FROM profiles WHERE user_id = p_user_id;

    -- Log the transaction
    INSERT INTO token_transactions (
        to_user_id,
        amount,
        transaction_type,
        status,
        reference_id,
        metadata
    ) VALUES (
        p_user_id,
        p_token_amount,
        'purchase',
        'completed',
        p_reference_id,
        p_metadata
    ) RETURNING id INTO v_transaction_id;

    -- Build success response
    v_result := json_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'user_id', p_user_id,
        'amount', p_token_amount,
        'new_balance', v_new_balance
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    -- Log failed transaction
    INSERT INTO token_transactions (
        to_user_id,
        amount,
        transaction_type,
        status,
        reference_id,
        metadata,
        error_message
    ) VALUES (
        p_user_id,
        p_token_amount,
        'purchase',
        'failed',
        p_reference_id,
        p_metadata,
        SQLERRM
    );
    
    -- Re-raise the exception
    RAISE;
END;
$$;

-- ================================================
-- 5. GRANT EXECUTE PERMISSIONS
-- ================================================

-- Allow authenticated users to call these functions
GRANT EXECUTE ON FUNCTION transfer_tokens(TEXT, TEXT, INTEGER, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION add_tokens(TEXT, INTEGER, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_tokens(TEXT, TEXT, INTEGER, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION add_tokens(TEXT, INTEGER, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION transfer_tokens(TEXT, TEXT, INTEGER, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION add_tokens(TEXT, INTEGER, TEXT, JSONB) TO service_role;
