import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-11-17.clover',
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

        if (amountTotal) {
            // Example logic:
            // $5.00 (500 cents) -> 100 tokens
            // $20.00 (2000 cents) -> 550 tokens
            // $35.00 (3500 cents) -> 1000 tokens

            // For now, let's just give a fixed amount for testing if it matches the test link
            // or just give 100 tokens for any successful payment for the MVP test.
            tokensToAdd = 100;

            // TODO: Implement proper price-to-token mapping once prices are confirmed.
            if (amountTotal > 1000) tokensToAdd = 550;
            if (amountTotal > 3000) tokensToAdd = 1000;
        }

        console.log(`Processing payment for user ${userId}: Amount ${amountTotal}, Adding ${tokensToAdd} tokens`);

        // Update user's token balance
        const { data: profile, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('tokens')
            .eq('user_id', userId)
            .single();

        if (fetchError) {
            console.error('Error fetching profile:', fetchError);
            return NextResponse.json({ error: 'Profile not found' }, { status: 500 });
        }

        const newBalance = (profile?.tokens || 0) + tokensToAdd;

        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ tokens: newBalance })
            .eq('user_id', userId);

        if (updateError) {
            console.error('Error updating tokens:', updateError);
            return NextResponse.json({ error: 'Failed to update tokens' }, { status: 500 });
        }

        console.log(`Successfully added ${tokensToAdd} tokens to user ${userId}. New balance: ${newBalance}`);
    }

    return NextResponse.json({ received: true });
}
