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

        // Update verification criteria
        const { error } = await supabaseAdmin.rpc('update_verification_criteria', {
            p_user_id: userId,
        });

        if (error) {
            console.error('Update verification criteria error:', error);
            return NextResponse.json({ error: 'Failed to update criteria' }, { status: 500 });
        }

        // Get updated criteria
        const { data: criteria, error: criteriaError } = await supabaseAdmin
            .from('verification_criteria')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (criteriaError) {
            console.error('Error fetching criteria:', criteriaError);
            return NextResponse.json({ error: 'Failed to fetch updated criteria' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            criteria,
        });
    } catch (error) {
        console.error('Update criteria error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
