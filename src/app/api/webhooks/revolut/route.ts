import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWebhookSignature, RevolutOrder } from '@/lib/revolut-client';
import { getTokensForAmount } from '@/lib/revolut-payment-links';

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RevolutWebhookPayload {
    event: string;
    order_id: string;
    timestamp: string;
    data?: RevolutOrder;
}

export async function POST(req: Request) {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('revolut-signature');

    // Verify webhook signature (optional - will skip if secret not configured)
    const webhookSecret = process.env.REVOLUT_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
        const isValid = verifyWebhookSignature(body, signature, webhookSecret);
        if (!isValid) {
            console.error('[Revolut Webhook] Signature verification failed');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
        console.log('[Revolut Webhook] Signature verified successfully');
    } else if (!webhookSecret) {
        console.warn('[Revolut Webhook] ⚠️ REVOLUT_WEBHOOK_SECRET not set - skipping signature verification. Set this in production!');
    } else if (!signature) {
        console.warn('[Revolut Webhook] No signature header received');
    }

    let payload: RevolutWebhookPayload;
    try {
        payload = JSON.parse(body);
    } catch (err) {
        console.error('[Revolut Webhook] Failed to parse payload:', err);
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    console.log('[Revolut Webhook] Received event:', payload.event, 'Order:', payload.order_id);

    // Handle ORDER_COMPLETED event
    if (payload.event === 'ORDER_COMPLETED' && payload.data) {
        const order = payload.data;
        const merchantRef = order.merchant_order_ext_ref;
        const amount = order.order_amount?.value;

        if (!merchantRef) {
            console.error('[Revolut Webhook] No merchant_order_ext_ref in order');
            return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
        }

        // Parse merchant reference to determine payment type
        // Format: "token_{userId}_{timestamp}" or "brand_{storyId}"
        const [type, ...rest] = merchantRef.split('_');

        if (type === 'token') {
            // Token purchase flow
            const userId = rest[0];
            
            if (!userId) {
                console.error('[Revolut Webhook] No user ID in merchant reference');
                return NextResponse.json({ error: 'Invalid reference format' }, { status: 400 });
            }

            // Determine tokens to add based on amount
            const tokensToAdd = getTokensForAmount(amount);

            if (tokensToAdd <= 0) {
                console.error('[Revolut Webhook] Could not determine token amount:', { amount });
                return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
            }

            console.log(`[Revolut Webhook] Processing token purchase: User ${userId}, Amount ${amount}, Tokens ${tokensToAdd}`);

            // Use atomic RPC function to add tokens
            const { data, error } = await supabaseAdmin.rpc('add_tokens', {
                p_user_id: userId,
                p_token_amount: tokensToAdd,
                p_reference_id: order.id,
                p_metadata: {
                    revolut_order_id: order.id,
                    revolut_public_id: order.public_id,
                    amount: amount,
                    currency: order.order_amount?.currency,
                    payment_type: 'token_purchase',
                },
            });

            if (error) {
                console.error('[Revolut Webhook] Error adding tokens:', error);
                return NextResponse.json({ error: 'Failed to add tokens' }, { status: 500 });
            }

            const result = typeof data === 'string' ? JSON.parse(data) : data;
            console.log(`[Revolut Webhook] Successfully added ${tokensToAdd} tokens to user ${userId}. New balance: ${result.new_balance}`);

        } else if (type === 'brand') {
            // Brand post payment flow
            const storyId = rest[0];

            if (!storyId) {
                console.error('[Revolut Webhook] No story ID in merchant reference');
                return NextResponse.json({ error: 'Invalid reference format' }, { status: 400 });
            }

            console.log(`[Revolut Webhook] Processing brand post payment for story: ${storyId}`);

            // Update story payment status
            const { error } = await supabaseAdmin
                .from('stories')
                .update({
                    payment_status: 'completed',
                    payment_completed_at: new Date().toISOString(),
                    revolut_payment_id: order.id,
                })
                .eq('id', storyId);

            if (error) {
                console.error('[Revolut Webhook] Error updating story payment status:', error);
                return NextResponse.json({ error: 'Failed to update story' }, { status: 500 });
            }

            console.log(`[Revolut Webhook] Successfully marked story ${storyId} as paid`);
        } else {
            console.warn('[Revolut Webhook] Unknown reference type:', type);
        }
    }

    return NextResponse.json({ received: true });
}
