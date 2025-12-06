# 🔐 Token & Payment System Audit Report
**Date:** December 5, 2025  
**Status:** ⚠️ REQUIRES ATTENTION BEFORE PRODUCTION

---

## ✅ What's Working

### 1. Database Schema
- ✅ `profiles.tokens` column exists with default value of 100
- ✅ `stories.monetization_cost` column added
- ✅ Check constraint ensures non-negative monetization costs
- ✅ RLS policies allow profile updates

### 2. Client-Side Token Management
- ✅ Zustand store tracks token balance locally
- ✅ `addTokens()` and `deductTokens()` functions work correctly
- ✅ Balance displayed in profile wallet link
- ✅ Wallet page refreshes balance on visibility/focus

### 3. Monetization Flow
- ✅ CreateStory component allows setting token cost for public stories
- ✅ FeedItem shows monetization modal before contribution
- ✅ Story page validates balance before allowing contribution
- ✅ Token transfer API endpoint exists at `/api/transfer-tokens`
- ✅ Refund logic in place if transfer fails

### 4. Stripe Integration
- ✅ Stripe webhook endpoint at `/api/webhooks/stripe`
- ✅ Payment links configured in wallet page
- ✅ Client reference ID passed to track purchases
- ✅ All required environment variables present

---

## 🚨 Critical Issues

### 1. **TRANSACTION SAFETY** ⚠️ SEVERITY: HIGH
**Location:** `/api/transfer-tokens/route.ts` lines 50-66

**Problem:**
```typescript
// Deduct from sender
await supabaseAdmin.update({ tokens: newFromBalance }).eq('user_id', fromUserId);

// Credit recipient
await supabaseAdmin.update({ tokens: newToBalance }).eq('user_id', toUserId);
// If this fails, sender already lost tokens! No rollback!
```

**Issue:** No database transaction wrapper. If the credit operation fails after deduction, tokens are lost permanently.

**Impact:** Users could lose tokens without recipients receiving them. **THIS IS A CRITICAL BUG.**

**Fix Required:** Implement proper database transactions or use Supabase RPC function.

---

### 2. **STRIPE WEBHOOK TOKEN MAPPING** ⚠️ SEVERITY: HIGH
**Location:** `/api/webhooks/stripe/route.ts` lines 67-79

**Problem:**
```typescript
// Heuristic mapping (adjust based on actual link prices)
tokensToAdd = 100;
if (amountTotal > 1000) tokensToAdd = 550;
if (amountTotal > 3000) tokensToAdd = 1000;
```

**Issue:** Hard-coded price-to-token mapping is a guess. Won't work correctly with real Stripe prices.

**Impact:** Users might receive wrong amount of tokens or no tokens at all.

**Fix Required:** Implement proper price mapping based on actual Stripe product prices.

---

### 3. **RACE CONDITIONS** ⚠️ SEVERITY: MEDIUM
**Location:** Multiple places where token balance is read then updated

**Problem:**
- Client-side `deductTokens()` doesn't lock the balance
- Multiple simultaneous contributions could bypass balance checks
- No server-side validation of token balance at contribution time

**Impact:** Users could spend more tokens than they have through rapid clicking.

**Fix Required:** Move balance validation to server-side, use database constraints.

---

### 4. **NO TRANSACTION LOG** ⚠️ SEVERITY: MEDIUM
**Problem:** No database table to track token transactions

**Impact:**
- Can't audit token movements
- Can't refund failed transactions
- No history for users to review
- Can't debug payment issues

**Fix Required:** Create `token_transactions` table with all transfers logged.

---

### 5. **INCOMPLETE ERROR HANDLING** ⚠️ SEVERITY: MEDIUM
**Location:** Multiple payment flows

**Issues:**
- Webhook errors not logged to persistent storage
- No retry mechanism for failed transfers
- No notification to users about failed payments
- Client-side refunds not synced to database

---

## 📋 Required Fixes (Priority Order)

### PRIORITY 1: Fix Transaction Safety
```sql
-- Create RPC function for atomic token transfer
CREATE OR REPLACE FUNCTION transfer_tokens(
    from_user_id TEXT,
    to_user_id TEXT,
    token_amount INTEGER
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    from_balance INTEGER;
    to_balance INTEGER;
    result json;
BEGIN
    -- Lock rows in consistent order to prevent deadlock
    IF from_user_id < to_user_id THEN
        SELECT tokens INTO from_balance FROM profiles WHERE user_id = from_user_id FOR UPDATE;
        SELECT tokens INTO to_balance FROM profiles WHERE user_id = to_user_id FOR UPDATE;
    ELSE
        SELECT tokens INTO to_balance FROM profiles WHERE user_id = to_user_id FOR UPDATE;
        SELECT tokens INTO from_balance FROM profiles WHERE user_id = from_user_id FOR UPDATE;
    END IF;

    -- Validate balance
    IF from_balance IS NULL THEN
        RAISE EXCEPTION 'Sender not found';
    END IF;
    IF to_balance IS NULL THEN
        RAISE EXCEPTION 'Recipient not found';
    END IF;
    IF from_balance < token_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Perform transfer
    UPDATE profiles SET tokens = tokens - token_amount WHERE user_id = from_user_id;
    UPDATE profiles SET tokens = tokens + token_amount WHERE user_id = to_user_id;

    -- Get new balances
    SELECT tokens INTO from_balance FROM profiles WHERE user_id = from_user_id;
    SELECT tokens INTO to_balance FROM profiles WHERE user_id = to_user_id;

    -- Return result
    result := json_build_object(
        'success', true,
        'from_balance', from_balance,
        'to_balance', to_balance
    );
    
    RETURN result;
END;
$$;
```

### PRIORITY 2: Add Transaction Logging
```sql
-- Token transactions table
CREATE TABLE IF NOT EXISTS token_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id TEXT REFERENCES profiles(user_id),
    to_user_id TEXT REFERENCES profiles(user_id),
    amount INTEGER NOT NULL CHECK (amount > 0),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('transfer', 'purchase', 'refund', 'admin')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
    reference_id TEXT, -- Stripe session ID or story contribution ID
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_txn_from_user ON token_transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_token_txn_to_user ON token_transactions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_token_txn_reference ON token_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_token_txn_created ON token_transactions(created_at DESC);

-- RLS Policies
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their transactions" ON token_transactions
    FOR SELECT USING (
        auth.uid()::text = from_user_id OR 
        auth.uid()::text = to_user_id
    );
```

### PRIORITY 3: Fix Stripe Webhook Mapping
```typescript
// In /api/webhooks/stripe/route.ts
const PRICE_TO_TOKEN_MAP: Record<number, number> = {
    100: 100,   // $1.00 = 100 tokens (UPDATE WITH ACTUAL PRICES)
    500: 550,   // $5.00 = 550 tokens
    1000: 1000, // $10.00 = 1000 tokens
};

function getTokensForAmount(amountInCents: number): number {
    const tokens = PRICE_TO_TOKEN_MAP[amountInCents];
    if (!tokens) {
        console.error(`Unknown payment amount: ${amountInCents} cents`);
        return 0;
    }
    return tokens;
}
```

### PRIORITY 4: Add Server-Side Validation
```typescript
// In /api/stories/[id]/contribute endpoint (TO BE CREATED)
export async function POST(req: Request) {
    const { storyId, userId, monetizationCost } = await req.json();
    
    // Validate balance server-side
    const { data: profile } = await supabase
        .from('profiles')
        .select('tokens')
        .eq('user_id', userId)
        .single();
        
    if (profile.tokens < monetizationCost) {
        return NextResponse.json(
            { error: 'Insufficient balance' },
            { status: 400 }
        );
    }
    
    // Use RPC for atomic transfer
    const { data, error } = await supabase.rpc('transfer_tokens', {
        from_user_id: userId,
        to_user_id: creatorId,
        token_amount: monetizationCost
    });
    
    // ... rest of contribution logic
}
```

---

## 🧪 Testing Checklist

### Before Production:
- [ ] Test Stripe webhook with test payments
- [ ] Verify tokens are added correctly for each payment tier
- [ ] Test token transfer between users (concurrent requests)
- [ ] Test insufficient balance scenarios
- [ ] Test network failures during payment
- [ ] Test refund scenarios
- [ ] Verify transaction logs are created
- [ ] Test wallet balance refresh after payment
- [ ] Test monetization flow end-to-end
- [ ] Load test: 10+ simultaneous contributions to same story

### Security Tests:
- [ ] Verify users can't modify others' balances
- [ ] Test negative token amounts (should be blocked)
- [ ] Test SQL injection in transfer endpoints
- [ ] Verify webhook signature validation works
- [ ] Test replay attacks on webhook

---

## 📊 Production Readiness Score: **4/10**

### Ready:
✅ Basic infrastructure in place  
✅ UI/UX complete  
✅ Environment variables configured  

### Not Ready:
❌ Critical transaction safety issues  
❌ No transaction logging  
❌ Race condition vulnerabilities  
❌ Incomplete error handling  
❌ No monitoring/alerting  

---

## 🚀 Deployment Steps

1. **Apply database migrations** (transaction function + logging table)
2. **Update API endpoints** to use RPC function
3. **Configure Stripe webhook** in production
4. **Update price mapping** with actual Stripe prices
5. **Test in staging** with real Stripe test mode
6. **Monitor webhook logs** for 24 hours
7. **Set up alerts** for failed transactions
8. **Deploy to production**

---

## 📞 Action Required

**DO NOT deploy to production** until at minimum:
1. ✅ Transaction safety fix is implemented (Priority 1)
2. ✅ Stripe price mapping is configured correctly (Priority 3)
3. ✅ Transaction logging table is created (Priority 2)

**Estimated time to fix:** 4-6 hours of development + testing

---

## 💡 Recommendations

### Short Term (Before Launch):
1. Implement atomic transactions
2. Add transaction logging
3. Fix Stripe webhook mapping
4. Add comprehensive error logging

### Medium Term (Post-Launch):
1. Add transaction history page for users
2. Implement refund system
3. Add admin dashboard for token management
4. Set up monitoring and alerting

### Long Term:
1. Consider token expiration policy
2. Add promotional token features
3. Implement token gifting
4. Add bulk purchase discounts
