import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
    try {
        const { fromUserId, toUserId, amount, referenceId, metadata } = await req.json();

        if (!fromUserId || !toUserId || !amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        // Use atomic RPC function for safe transfer
        const { data, error } = await supabaseAdmin.rpc('transfer_tokens', {
            p_from_user_id: fromUserId,
            p_to_user_id: toUserId,
            p_token_amount: amount,
            p_reference_id: referenceId || null,
            p_metadata: metadata || null,
        });

        if (error) {
            console.error('Token transfer failed:', error);
            
            // Parse error message for better client feedback
            const errorMessage = error.message || 'Transfer failed';
            
            if (errorMessage.includes('Insufficient balance')) {
                return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
            }
            if (errorMessage.includes('not found')) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }
            
            return NextResponse.json({ error: errorMessage }, { status: 500 });
        }

        // Parse the JSON result from the RPC function
        const result = typeof data === 'string' ? JSON.parse(data) : data;

        return NextResponse.json({
            success: true,
            transactionId: result.transaction_id,
            newFromBalance: result.from_balance,
            newToBalance: result.to_balance,
        });
    } catch (error) {
        console.error('Transfer tokens error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
