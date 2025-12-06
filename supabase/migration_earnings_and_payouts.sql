-- Earnings and Payouts System Migration
-- This adds tracking for earned tokens separately and payout functionality

-- ================================================
-- 1. ADD EARNINGS TRACKING TO PROFILES
-- ================================================

-- Add columns to track earned tokens separately from purchased/gifted tokens
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS earned_tokens INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS total_earned INTEGER DEFAULT 0 NOT NULL; -- Lifetime earnings

-- Add check constraints
ALTER TABLE profiles
  ADD CONSTRAINT IF NOT EXISTS check_earned_tokens_non_negative CHECK (earned_tokens >= 0),
  ADD CONSTRAINT IF NOT EXISTS check_total_earned_non_negative CHECK (total_earned >= 0);

-- ================================================
-- 2. CREATE PAYOUT REQUESTS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS payout_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    amount_tokens INTEGER NOT NULL CHECK (amount_tokens > 0),
    amount_usd DECIMAL(10, 2) NOT NULL CHECK (amount_usd > 0),
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'failed')) DEFAULT 'pending',
    payment_method TEXT, -- 'stripe', 'paypal', 'bank_transfer', etc.
    payment_email TEXT,
    payment_details JSONB, -- Store payment method details
    admin_notes TEXT,
    processed_by TEXT, -- Admin user who processed it
    processed_at TIMESTAMPTZ,
    stripe_transfer_id TEXT, -- Reference to Stripe payout
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payout_user ON payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_created ON payout_requests(created_at DESC);

-- ================================================
-- 3. RLS POLICIES FOR PAYOUT REQUESTS
-- ================================================

ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their payout requests" ON payout_requests;
CREATE POLICY "Users can view their payout requests" ON payout_requests
    FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create payout requests" ON payout_requests;
CREATE POLICY "Users can create payout requests" ON payout_requests
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- ================================================
-- 4. UPDATE TRANSFER_TOKENS TO TRACK EARNINGS
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
SECURITY DEFINER
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

    -- Lock rows in consistent order to prevent deadlock
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

    -- Perform the atomic transfer
    UPDATE profiles 
    SET tokens = tokens - p_token_amount,
        updated_at = NOW()
    WHERE user_id = p_from_user_id;

    -- Update recipient: increase tokens AND earned_tokens AND total_earned
    UPDATE profiles 
    SET tokens = tokens + p_token_amount,
        earned_tokens = earned_tokens + p_token_amount,
        total_earned = total_earned + p_token_amount,
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
    
    RAISE;
END;
$$;

-- ================================================
-- 5. CREATE PAYOUT REQUEST FUNCTION
-- ================================================

CREATE OR REPLACE FUNCTION request_payout(
    p_user_id TEXT,
    p_amount_tokens INTEGER,
    p_payment_method TEXT,
    p_payment_email TEXT,
    p_payment_details JSONB DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_earned_tokens INTEGER;
    v_amount_usd DECIMAL(10, 2);
    v_payout_id UUID;
    v_token_value DECIMAL(10, 2) := 0.10; -- $0.10 per token
    v_min_payout_tokens INTEGER := 500; -- Minimum 500 tokens = $50
    v_result json;
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF p_amount_tokens <= 0 THEN
        RAISE EXCEPTION 'Payout amount must be positive';
    END IF;

    -- Check minimum payout
    IF p_amount_tokens < v_min_payout_tokens THEN
        RAISE EXCEPTION 'Minimum payout is % tokens ($%)', v_min_payout_tokens, (v_min_payout_tokens * v_token_value);
    END IF;

    -- Lock user profile
    SELECT earned_tokens INTO v_earned_tokens 
    FROM profiles 
    WHERE user_id = p_user_id 
    FOR UPDATE;

    IF v_earned_tokens IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;

    -- Check if user has enough earned tokens
    IF v_earned_tokens < p_amount_tokens THEN
        RAISE EXCEPTION 'Insufficient earned tokens. Available: %, Requested: %', v_earned_tokens, p_amount_tokens;
    END IF;

    -- Calculate USD amount
    v_amount_usd := p_amount_tokens * v_token_value;

    -- Deduct earned_tokens (but keep in total tokens until payout is completed)
    UPDATE profiles 
    SET earned_tokens = earned_tokens - p_amount_tokens,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Create payout request
    INSERT INTO payout_requests (
        user_id,
        amount_tokens,
        amount_usd,
        payment_method,
        payment_email,
        payment_details,
        status
    ) VALUES (
        p_user_id,
        p_amount_tokens,
        v_amount_usd,
        p_payment_method,
        p_payment_email,
        p_payment_details,
        'pending'
    ) RETURNING id INTO v_payout_id;

    -- Log transaction
    INSERT INTO token_transactions (
        from_user_id,
        amount,
        transaction_type,
        status,
        reference_id,
        metadata
    ) VALUES (
        p_user_id,
        p_amount_tokens,
        'refund', -- Using 'refund' type for payout request
        'pending',
        v_payout_id::TEXT,
        jsonb_build_object(
            'payout_request_id', v_payout_id,
            'amount_usd', v_amount_usd,
            'payment_method', p_payment_method
        )
    );

    v_result := json_build_object(
        'success', true,
        'payout_id', v_payout_id,
        'amount_tokens', p_amount_tokens,
        'amount_usd', v_amount_usd,
        'status', 'pending'
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;

-- ================================================
-- 6. HELPER FUNCTION TO GET TOKEN VALUE
-- ================================================

CREATE OR REPLACE FUNCTION get_token_value()
RETURNS DECIMAL(10, 2)
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT 0.10::DECIMAL(10, 2); -- $0.10 per token
$$;

-- ================================================
-- 7. GRANT EXECUTE PERMISSIONS
-- ================================================

GRANT EXECUTE ON FUNCTION request_payout(TEXT, INTEGER, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_token_value() TO authenticated;
GRANT EXECUTE ON FUNCTION get_token_value() TO anon;
