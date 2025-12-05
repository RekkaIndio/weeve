# Supabase Email Integration for Support Tickets

This setup uses Supabase to handle support email routing through a queue-based system.

## Architecture

1. **Support Ticket Flow**:
   - User submits support request → Saved to `support_tickets` table
   - API also adds entry to `support_email_queue` table
   - Edge Function processes queue and sends emails via Resend

2. **Email Service Options**:
   - **Resend** (Recommended) - Simple, reliable, great developer experience
   - **SendGrid** - Enterprise-grade with advanced features
   - **AWS SES** - Cost-effective for high volume
   - **Postmark** - Great for transactional emails

## Setup Instructions

### Option 1: Using Supabase Edge Functions (Recommended)

#### 1. Install Supabase CLI
```bash
npm install -g supabase
supabase login
```

#### 2. Link to your project
```bash
supabase link --project-ref fvyhyexdndynoonkzwbd
```

#### 3. Deploy the Edge Function
```bash
supabase functions deploy send-support-email
```

#### 4. Set up Resend API Key
1. Sign up at [resend.com](https://resend.com)
2. Get your API key
3. Set it in Supabase:
```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

#### 5. Verify your domain in Resend
- Add `support@tryweeve.com` as a verified sender
- Or use Resend's sandbox for testing

#### 6. Set up a Cron Job (Optional)
Create a scheduled function to process the queue every minute:
```bash
# In Supabase Dashboard > Edge Functions > Cron Jobs
# Add: */1 * * * * (every minute)
# Target: send-support-email
```

Or trigger manually via HTTP:
```bash
curl -X POST https://fvyhyexdndynoonkzwbd.supabase.co/functions/v1/send-support-email \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Option 2: Using Database Triggers with pg_net

If you prefer to send emails directly from the database:

1. Enable pg_net extension in Supabase:
   - Go to Database > Extensions
   - Enable `pg_net`

2. Uncomment the trigger function in `migration_settings_features.sql`

3. Set your Resend API key as a database setting:
```sql
ALTER DATABASE postgres SET app.resend_api_key = 're_xxxxxxxxxxxxx';
```

### Option 3: External Service (Simplest)

Use a separate service to poll the queue:

1. Create a simple Node.js script or serverless function
2. Poll `support_email_queue` every minute for pending emails
3. Send via your preferred email service
4. Update status to 'sent' or 'failed'

## Database Tables

### `support_tickets`
Stores all support requests from users.

### `support_email_queue`
Queue for outgoing support emails. Statuses:
- `pending` - Waiting to be sent
- `sent` - Successfully delivered
- `failed` - Failed after 3 retries

## Email Template

The Edge Function includes a professional HTML email template with:
- Branded header with gradient
- Structured request details
- Category badge
- Timestamp
- Responsive design

## Testing

1. Submit a test support request through the app
2. Check `support_email_queue` table:
```sql
SELECT * FROM support_email_queue ORDER BY created_at DESC LIMIT 5;
```

3. Manually trigger the Edge Function:
```bash
curl -X POST https://fvyhyexdndynoonkzwbd.supabase.co/functions/v1/send-support-email \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

4. Verify email delivery in Resend dashboard

## Monitoring

Monitor email delivery:
```sql
-- Check queue status
SELECT 
  status, 
  COUNT(*) as count,
  MAX(created_at) as latest
FROM support_email_queue
GROUP BY status;

-- View failed emails
SELECT * FROM support_email_queue 
WHERE status = 'failed' 
ORDER BY created_at DESC;

-- Retry failed emails (reset status)
UPDATE support_email_queue 
SET status = 'pending', retry_count = 0
WHERE status = 'failed' AND retry_count < 3;
```

## Cost Estimates

**Resend Pricing**:
- Free: 3,000 emails/month
- Pro: $20/month for 50,000 emails
- Perfect for support tickets

**Supabase Edge Functions**:
- Free: 500K invocations/month
- More than enough for support emails

## Security Notes

- Service role key is used server-side only (never exposed to client)
- RLS policies ensure users can only view their own tickets
- Email queue has service role access only
- API rate limiting recommended for production

## Alternative: Direct Integration

If you prefer not to use a queue, you can send emails directly from the API route:

```typescript
// In /api/support/email/route.ts
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'support@tryweeve.com',
    to: 'hello@tryweeve.com',
    subject: subject,
    html: emailHtml,
  }),
});
```

This is simpler but less reliable (no retries, no queue management).
