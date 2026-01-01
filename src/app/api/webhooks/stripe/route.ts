import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Initialize Supabase Admin Client (needs service role key to bypass RLS if needed, 
// but here we might just use the standard client if we have the right permissions or use a service role key)
// Ideally we should use a service role key for admin operations like adding tokens without user session.
// For now, let's assume we have a way to update profiles. 
// If we don't have a service role key in env, we might run into RLS issues if we try to update another user's profile.
// Let's check if we have SUPABASE_SERVICE_ROLE_KEY. If not, we might need to add it or relax RLS for this specific operation (risky).
// Actually, RLS usually allows "update own profile". But the webhook is not the user.
// So we MUST use the Service Role Key.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Fallback to anon (will fail RLS if not careful)
);

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get('stripe-signature')!;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
        console.error(`Webhook signature verification failed.`, err);
        return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const amountTotal = session.amount_total; // in cents

        if (!userId) {
            console.error('No client_reference_id found in session');
            return NextResponse.json({ error: 'No user ID found' }, { status: 400 });
        }

        // Determine token amount based on amount paid
        // Logic:
        // 100 tokens ~ $1.00 (100 cents) ?? Or whatever the test link price is.
        // Let's assume a mapping or just log it for now.
        // Since we don't know the exact prices set in the links, we'll use a heuristic or just give 1 token per cent for now as a placeholder,
        // OR better: check the amount and map it to the packages we know.

        let tokensToAdd = 0;

        // Heuristic mapping (adjust based on actual link prices)
        // Assuming the user set reasonable prices.
        // If we can't determine, we might default to 100 for testing.

        // For the test link provided (100 tokens), let's see what the price is.
        // We can't see it here.
        // Let's implement a safe fallback:

        // Map payment amount to tokens
        // TODO: Update these values with your actual Stripe product prices
        const PRICE_TO_TOKEN_MAP: Record<number, number> = {
            100: 100,    // $1.00 = 100 tokens (adjust based on your pricing)
            500: 550,    // $5.00 = 550 tokens
            1000: 1000,  // $10.00 = 1000 tokens
            2000: 2200,  // $20.00 = 2200 tokens (example bonus)
            5000: 6000,  // $50.00 = 6000 tokens (example bonus)
        };

        // Try exact match first
        if (amountTotal && PRICE_TO_TOKEN_MAP[amountTotal]) {
            tokensToAdd = PRICE_TO_TOKEN_MAP[amountTotal];
        } else if (amountTotal) {
            // Fallback: approximate mapping for unknown amounts
            console.warn(`Unknown payment amount: ${amountTotal} cents. Using fallback calculation.`);
            tokensToAdd = Math.floor(amountTotal / 10); // 10 cents = 1 token as fallback
        }

        if (tokensToAdd === 0) {
            console.error('Could not determine token amount for payment:', { userId, amountTotal });
            return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
        }

        console.log(`Processing payment for user ${userId}: Amount ${amountTotal} cents, Adding ${tokensToAdd} tokens`);

        // Use atomic RPC function to add tokens
        const { data, error } = await supabaseAdmin.rpc('add_tokens', {
            p_user_id: userId,
            p_token_amount: tokensToAdd,
            p_reference_id: session.id, // Stripe session ID
            p_metadata: {
                stripe_session_id: session.id,
                amount_cents: amountTotal,
                payment_status: session.payment_status,
            },
        });

        if (error) {
            console.error('Error adding tokens:', error);
            return NextResponse.json({ error: 'Failed to add tokens' }, { status: 500 });
        }

        const result = typeof data === 'string' ? JSON.parse(data) : data;
        console.log(`Successfully added ${tokensToAdd} tokens to user ${userId}. New balance: ${result.new_balance}`);
    }

    return NextResponse.json({ received: true });
}
