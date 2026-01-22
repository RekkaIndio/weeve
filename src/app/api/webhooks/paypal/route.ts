import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWebhookSignature } from '@/lib/paypal-client';
import { getTokensForAmount, parseReferenceId, TOKEN_PACKAGES } from '@/lib/paypal-payment';

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PayPalWebhookEvent {
  id: string;
  event_version: string;
  create_time: string;
  resource_type: string;
  event_type: string;
  summary: string;
  resource: {
    id: string;
    status?: string;
    purchase_units?: {
      reference_id?: string;
      amount?: {
        currency_code: string;
        value: string;
      };
      payments?: {
        captures?: {
          id: string;
          status: string;
          amount: {
            currency_code: string;
            value: string;
          };
        }[];
      };
    }[];
  };
}

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  
  // Get PayPal webhook headers for signature verification
  const transmissionId = headersList.get('paypal-transmission-id');
  const transmissionTime = headersList.get('paypal-transmission-time');
  const certUrl = headersList.get('paypal-cert-url');
  const authAlgo = headersList.get('paypal-auth-algo');
  const transmissionSig = headersList.get('paypal-transmission-sig');

  // Verify webhook signature if webhook ID is configured
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  
  if (webhookId && transmissionId && transmissionTime && certUrl && authAlgo && transmissionSig) {
    let payload: PayPalWebhookEvent;
    try {
      payload = JSON.parse(body);
    } catch (err) {
      console.error('[PayPal Webhook] Failed to parse payload:', err);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const isValid = await verifyWebhookSignature(
      webhookId,
      { transmissionId, transmissionTime, certUrl, authAlgo, transmissionSig },
      payload
    );

    if (!isValid) {
      console.error('[PayPal Webhook] Signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else if (!webhookId) {
    console.warn('[PayPal Webhook] ⚠️ PAYPAL_WEBHOOK_ID not set - skipping signature verification. Set this in production!');
  }

  let payload: PayPalWebhookEvent;
  try {
    payload = JSON.parse(body);
  } catch (err) {
    console.error('[PayPal Webhook] Failed to parse payload:', err);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('[PayPal Webhook] Received event:', payload.event_type, payload.id);

  // Handle payment capture completed event
  if (payload.event_type === 'PAYMENT.CAPTURE.COMPLETED' && payload.resource) {
    const capture = payload.resource;
    const purchaseUnits = capture.purchase_units;
    const referenceId = purchaseUnits?.[0]?.reference_id;

    if (!referenceId) {
      console.warn('[PayPal Webhook] No reference_id in payment - cannot process');
      return NextResponse.json({ received: true, skipped: 'no_reference' });
    }

    const parsed = parseReferenceId(referenceId);
    const captureDetails = purchaseUnits?.[0]?.payments?.captures?.[0];
    const captureId = captureDetails?.id || capture.id;
    const amountValue = captureDetails?.amount?.value || purchaseUnits?.[0]?.amount?.value;
    const amountInMinor = amountValue ? Math.round(parseFloat(amountValue) * 100) : 0;

    if (parsed.type === 'token') {
      // Token purchase - add tokens to user
      const { userId, packageKey } = parsed;

      if (!userId || !packageKey) {
        console.error('[PayPal Webhook] Invalid token reference format:', referenceId);
        return NextResponse.json({ error: 'Invalid reference format' }, { status: 400 });
      }

      // Get token amount from package or payment amount
      const pkg = TOKEN_PACKAGES[packageKey as keyof typeof TOKEN_PACKAGES];
      const tokensToAdd = pkg?.tokens || getTokensForAmount(amountInMinor);

      if (tokensToAdd <= 0) {
        console.error('[PayPal Webhook] Could not determine token amount:', amountValue);
        return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
      }

      // Use atomic RPC function to add tokens
      const { error } = await supabaseAdmin.rpc('add_tokens', {
        p_user_id: userId,
        p_token_amount: tokensToAdd,
        p_reference_id: captureId,
        p_metadata: {
          paypal_capture_id: captureId,
          package: packageKey,
          amount: amountInMinor,
          currency: captureDetails?.amount?.currency_code || 'GBP',
          payment_type: 'token_purchase',
          provider: 'paypal',
          source: 'webhook',
        },
      });

      if (error) {
        // Check if it's a duplicate - if reference already exists, that's OK
        if (error.message?.includes('duplicate') || error.code === '23505') {
          console.log('[PayPal Webhook] Payment already processed (duplicate reference):', captureId);
          return NextResponse.json({ received: true, skipped: 'duplicate' });
        }
        console.error('[PayPal Webhook] Error adding tokens:', error);
        return NextResponse.json({ error: 'Failed to add tokens' }, { status: 500 });
      }

      console.log(`[PayPal Webhook] Added ${tokensToAdd} tokens to user ${userId}`);

    } else if (parsed.type === 'brand') {
      // Brand post payment - update story
      const { storyId } = parsed;

      if (!storyId) {
        console.error('[PayPal Webhook] Invalid brand reference format:', referenceId);
        return NextResponse.json({ error: 'Invalid reference format' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('stories')
        .update({
          payment_status: 'completed',
          payment_completed_at: new Date().toISOString(),
          paypal_capture_id: captureId,
        })
        .eq('id', storyId);

      if (error) {
        console.error('[PayPal Webhook] Error updating story payment status:', error);
        return NextResponse.json({ error: 'Failed to update story' }, { status: 500 });
      }

      console.log(`[PayPal Webhook] Updated story ${storyId} payment status to completed`);

    } else {
      console.warn('[PayPal Webhook] Unknown reference type:', referenceId);
    }
  }

  // Handle checkout order approved event (optional - backup for capture)
  if (payload.event_type === 'CHECKOUT.ORDER.APPROVED') {
    console.log('[PayPal Webhook] Order approved, waiting for capture:', payload.resource.id);
    // The capture will be triggered by the frontend, but we log it here
  }

  return NextResponse.json({ received: true });
}
