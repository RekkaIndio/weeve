import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        // Get monetization status using the helper function
        const { data: status, error: statusError } = await supabaseAdmin.rpc('get_monetization_status', {
            p_user_id: userId,
        });

        if (statusError) {
            console.error('Error fetching monetization status:', statusError);
            return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
        }

        // Get monetization requirements
        const { data: requirements, error: reqError } = await supabaseAdmin
            .from('monetization_requirements')
            .select('*')
            .order('requirement_type');

        if (reqError) {
            console.error('Error fetching requirements:', reqError);
        }

        return NextResponse.json({
            status,
            requirements: requirements || [],
        });
    } catch (error) {
        console.error('Monetization status error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
