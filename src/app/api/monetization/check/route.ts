import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
    try {
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        // Update verification criteria first (this updates all metrics)
        const { error: updateError } = await supabaseAdmin.rpc('update_verification_criteria', {
            p_user_id: userId,
        });

        if (updateError) {
            console.error('Error updating criteria:', updateError);
            return NextResponse.json({ error: 'Failed to update criteria' }, { status: 500 });
        }

        // Check and update monetization eligibility
        const { data: canMonetize, error: eligError } = await supabaseAdmin.rpc('update_monetization_eligibility', {
            p_user_id: userId,
        });

        if (eligError) {
            console.error('Error checking eligibility:', eligError);
            return NextResponse.json({ error: 'Failed to check eligibility' }, { status: 500 });
        }

        // Get updated status
        const { data: status, error: statusError } = await supabaseAdmin.rpc('get_monetization_status', {
            p_user_id: userId,
        });

        if (statusError) {
            console.error('Error fetching status:', statusError);
        }

        return NextResponse.json({
            eligible: canMonetize,
            status,
            message: canMonetize 
                ? 'Congratulations! You can now monetize your stories! 🎉' 
                : 'Keep creating content to unlock monetization.',
        });
    } catch (error) {
        console.error('Check monetization error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
