# 🚀 Database Migration Guide

## Prerequisites
You need to run these migrations in order for the earnings system to work:

1. `migration_token_transactions.sql` - Token transaction logging (if not already run)
2. `migration_earnings_and_payouts.sql` - Earnings tracking and payout system

---

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Open your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of the migration file
5. Paste into the SQL editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Verify success - you should see "Success. No rows returned"

### Option 2: Supabase CLI

```bash
# Make sure you're logged in
supabase login

# Link your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
supabase db push

# Or run specific file
psql $DATABASE_URL < supabase/migration_earnings_and_payouts.sql
```

---

## Migration Order

### 1. First Run: Token Transactions
**File:** `supabase/migration_token_transactions.sql`

This creates:
- `token_transactions` table
- `transfer_tokens()` RPC function
- `add_tokens()` RPC function

### 2. Second Run: Earnings & Payouts
**File:** `supabase/migration_earnings_and_payouts.sql`

This creates:
- `earned_tokens` and `total_earned` columns in `profiles`
- `payout_requests` table
- Updates `transfer_tokens()` to track earnings
- `request_payout()` RPC function

---

## Verification

After running the migrations, verify they worked:

### Check Tables
```sql
-- Check if columns exist
SELECT earned_tokens, total_earned FROM profiles LIMIT 1;

-- Check if payout_requests table exists
SELECT * FROM payout_requests LIMIT 1;
```

### Check Functions
```sql
-- List all functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';

-- Should include:
-- - transfer_tokens
-- - add_tokens
-- - request_payout
-- - get_token_value
```

---

## What Happens If You Don't Run the Migration?

The app will still work! The earnings page has graceful fallbacks:

- **Earnings Page**: Shows 0 tokens available, with a warning in console
- **Payout Requests**: Shows empty history
- **Token Transfers**: Still work (but don't track earnings separately)

However, you **MUST** run the migration before:
- Users can cash out earnings
- Tracking earned vs purchased tokens
- Viewing payout history

---

## Rollback (If Needed)

If something goes wrong, you can rollback:

```sql
-- Remove new columns
ALTER TABLE profiles 
  DROP COLUMN IF EXISTS earned_tokens,
  DROP COLUMN IF EXISTS total_earned;

-- Drop tables
DROP TABLE IF EXISTS payout_requests CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS request_payout CASCADE;
DROP FUNCTION IF EXISTS get_token_value CASCADE;
```

---

## Common Issues

### Issue: "column already exists"
**Solution:** The migration already ran successfully. You're good!

### Issue: "permission denied"
**Solution:** Make sure you're using the service role key or have admin access

### Issue: "function does not exist"
**Solution:** Run `migration_token_transactions.sql` first, then `migration_earnings_and_payouts.sql`

---

## After Migration

1. **Test the Earnings Page:**
   ```
   Visit: http://localhost:3000/earnings
   ```

2. **Create a Monetized Story:**
   - Set a token cost (e.g., 50 tokens)
   - Have another user contribute
   - Check your earnings page

3. **Test Payout Request:**
   - Once you have 500+ earned tokens
   - Click "Request Payout"
   - Fill in PayPal email
   - Submit request

4. **Verify in Database:**
   ```sql
   -- Check earned tokens
   SELECT user_id, earned_tokens, total_earned FROM profiles;
   
   -- Check payout requests
   SELECT * FROM payout_requests;
   
   -- Check transaction log
   SELECT * FROM token_transactions ORDER BY created_at DESC LIMIT 10;
   ```

---

## Production Deployment

For Vercel/production deployments:

1. Run migrations in production Supabase first
2. Test thoroughly in staging
3. Update environment variables if needed
4. Deploy to Vercel

---

## Need Help?

If you encounter issues:
1. Check the Supabase logs
2. Look for console warnings in the browser
3. Verify all environment variables are set
4. Check the migration files for syntax errors
