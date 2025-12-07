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

        // Check if verification criteria exists for this user
        const { data: existingCriteria, error: checkError } = await supabaseAdmin
            .from('verification_criteria')
            .select('user_id')
            .eq('user_id', userId)
            .single();

        // If no criteria exists, create initial record
        if (checkError && checkError.code === 'PGRST116') {
            const { error: insertError } = await supabaseAdmin
                .from('verification_criteria')
                .insert({
                    user_id: userId,
                    email_verified: true, // Assume email verified if they can log in
                });

            if (insertError) {
                console.error('Error creating verification criteria:', insertError);
                return NextResponse.json({ error: 'Failed to initialize criteria' }, { status: 500 });
            }
        }

        // Run the auto-grant function
        const { data, error } = await supabaseAdmin.rpc('auto_grant_verification', {
            p_user_id: userId,
        });

        if (error) {
            console.error('Auto-grant verification error:', error);
            return NextResponse.json({ error: 'Verification check failed' }, { status: 500 });
        }

        // Get updated profile
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('is_verified, verification_tier, verified_at')
            .eq('user_id', userId)
            .single();

        if (profileError) {
            console.error('Error fetching updated profile:', profileError);
        }

        return NextResponse.json({
            result: data,
            profile,
            message: getResultMessage(data),
        });
    } catch (error) {
        console.error('Verification check error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

function getResultMessage(result: string): string {
    if (result.startsWith('granted_')) {
        const tier = result.split('_')[1];
        return `Congratulations! You've been verified at the ${tier} tier! 🎉`;
    }
    if (result.startsWith('upgraded_')) {
        const tier = result.split('_')[1];
        return `You've been upgraded to ${tier} tier verification! 🚀`;
    }
    if (result.startsWith('downgraded_')) {
        const tier = result.split('_')[1];
        return `Your verification tier has been adjusted to ${tier}.`;
    }
    if (result === 'revoked') {
        return 'Verification has been removed. Keep engaging to earn it back!';
    }
    if (result === 'not_eligible') {
        return 'Keep creating content and engaging with the community to earn verification!';
    }
    if (result === 'unchanged') {
        return 'Your verification status is up to date.';
    }
    return 'Verification status checked.';
}
