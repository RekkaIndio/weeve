import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWebhookSignature } from '@/lib/square-client';
import { getTokensForAmount, parseReferenceId, TOKEN_PACKAGES } from '@/lib/square-payment';

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SquareWebhookPayload {
  merchant_id: string;
  type: string;
  event_id: string;
  created_at: string;
  data: {
    type: string;
    id: string;
    object: {
      payment?: {
        id: string;
        status: string;
        amount_money: {
          amount: number;
          currency: string;
        };
        reference_id?: string;
        note?: string;
        created_at: string;
      };
    };
  };
}

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('x-square-hmacsha256-signature');

  // Verify webhook signature (optional - will skip if secret not configured)
  const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const notificationUrl = process.env.SQUARE_WEBHOOK_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/square`;

  if (webhookSecret && signature) {
    const isValid = verifyWebhookSignature(body, signature, webhookSecret, notificationUrl);
    if (!isValid) {
      console.error('[Square Webhook] Signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else if (!webhookSecret) {
    console.warn('[Square Webhook] ⚠️ SQUARE_WEBHOOK_SIGNATURE_KEY not set - skipping signature verification. Set this in production!');
  } else if (!signature) {
    console.warn('[Square Webhook] No signature header received');
  }

  let payload: SquareWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch (err) {
    console.error('[Square Webhook] Failed to parse payload:', err);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('[Square Webhook] Received event:', payload.type, payload.event_id);

  // Handle payment.completed event
  if (payload.type === 'payment.completed' && payload.data?.object?.payment) {
    const payment = payload.data.object.payment;
    const referenceId = payment.reference_id;

    if (!referenceId) {
      console.warn('[Square Webhook] No reference_id in payment - cannot process');
      return NextResponse.json({ received: true, skipped: 'no_reference' });
    }

    const parsed = parseReferenceId(referenceId);

    if (parsed.type === 'token') {
      // Token purchase - add tokens to user
      const { userId, packageKey } = parsed;

      if (!userId || !packageKey) {
        console.error('[Square Webhook] Invalid token reference format:', referenceId);
        return NextResponse.json({ error: 'Invalid reference format' }, { status: 400 });
      }

      // Get token amount from package or payment amount
      const pkg = TOKEN_PACKAGES[packageKey as keyof typeof TOKEN_PACKAGES];
      const tokensToAdd = pkg?.tokens || getTokensForAmount(payment.amount_money.amount);

      if (tokensToAdd <= 0) {
        console.error('[Square Webhook] Could not determine token amount:', payment.amount_money);
        return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
      }

      // Use atomic RPC function to add tokens
      const { error } = await supabaseAdmin.rpc('add_tokens', {
        p_user_id: userId,
        p_token_amount: tokensToAdd,
        p_reference_id: payment.id,
        p_metadata: {
          square_payment_id: payment.id,
          package: packageKey,
          amount: payment.amount_money.amount,
          currency: payment.amount_money.currency,
          payment_type: 'token_purchase',
          provider: 'square',
          source: 'webhook',
        },
      });

      if (error) {
        console.error('[Square Webhook] Error adding tokens:', error);
        return NextResponse.json({ error: 'Failed to add tokens' }, { status: 500 });
      }

      console.log(`[Square Webhook] Added ${tokensToAdd} tokens to user ${userId}`);

    } else if (parsed.type === 'brand') {
      // Brand post payment - update story
      const { storyId } = parsed;

      if (!storyId) {
        console.error('[Square Webhook] Invalid brand reference format:', referenceId);
        return NextResponse.json({ error: 'Invalid reference format' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('stories')
        .update({
          payment_status: 'completed',
          payment_completed_at: new Date().toISOString(),
          square_payment_id: payment.id,
        })
        .eq('id', storyId);

      if (error) {
        console.error('[Square Webhook] Error updating story payment status:', error);
        return NextResponse.json({ error: 'Failed to update story' }, { status: 500 });
      }

      console.log(`[Square Webhook] Updated story ${storyId} payment status to completed`);

    } else {
      console.warn('[Square Webhook] Unknown reference type:', referenceId);
    }
  }

  return NextResponse.json({ received: true });
}
