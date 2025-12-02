import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
    try {
        const { fromUserId, toUserId, amount } = await req.json();

        if (!fromUserId || !toUserId || !amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        // Get current balances
        const { data: fromProfile, error: fromError } = await supabaseAdmin
            .from('profiles')
            .select('tokens')
            .eq('user_id', fromUserId)
            .single();

        if (fromError || !fromProfile) {
            return NextResponse.json({ error: 'Sender not found' }, { status: 404 });
        }

        const { data: toProfile, error: toError } = await supabaseAdmin
            .from('profiles')
            .select('tokens')
            .eq('user_id', toUserId)
            .single();

        if (toError || !toProfile) {
            return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
        }

        // Check if sender has enough tokens
        if (fromProfile.tokens < amount) {
            return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
        }

        // Perform the transfer
        const newFromBalance = fromProfile.tokens - amount;
        const newToBalance = toProfile.tokens + amount;

        const { error: deductError } = await supabaseAdmin
            .from('profiles')
            .update({ tokens: newFromBalance })
            .eq('user_id', fromUserId);

        if (deductError) {
            console.error('Error deducting tokens:', deductError);
            return NextResponse.json({ error: 'Transfer failed' }, { status: 500 });
        }

        const { error: creditError } = await supabaseAdmin
            .from('profiles')
            .update({ tokens: newToBalance })
            .eq('user_id', toUserId);

        if (creditError) {
            console.error('Error crediting tokens:', creditError);
            // TODO: Implement rollback mechanism
            return NextResponse.json({ error: 'Transfer failed' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            newFromBalance,
            newToBalance,
        });
    } catch (error) {
        console.error('Transfer tokens error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
