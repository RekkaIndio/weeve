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

        // Get verification progress using the view
        const { data: progress, error: progressError } = await supabaseAdmin
            .from('verification_progress')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (progressError) {
            console.error('Error fetching verification progress:', progressError);
            return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
        }

        // Get requirements for all tiers
        const { data: requirements, error: reqError } = await supabaseAdmin
            .from('verification_requirements')
            .select('*')
            .order('tier');

        if (reqError) {
            console.error('Error fetching requirements:', reqError);
            return NextResponse.json({ error: 'Failed to fetch requirements' }, { status: 500 });
        }

        // Get recent audit log entries
        const { data: auditLog, error: auditError } = await supabaseAdmin
            .from('verification_audit_log')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (auditError) {
            console.error('Error fetching audit log:', auditError);
        }

        return NextResponse.json({
            progress,
            requirements,
            auditLog: auditLog || [],
        });
    } catch (error) {
        console.error('Verification progress error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
