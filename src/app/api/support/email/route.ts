import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userName, userId, category, subject, description } = body;

        // Create Supabase admin client with service role
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Insert into support_email_queue table (will trigger email via database trigger)
        const { error: queueError } = await supabase
            .from('support_email_queue')
            .insert({
                to_email: 'hello@tryweeve.com',
                user_name: userName,
                user_id: userId,
                category,
                subject,
                description,
                status: 'pending',
            });

        if (queueError) {
            console.error('Failed to queue email:', queueError);
            // Still log the support request even if queuing fails
            console.log('Support Request (Fallback Log):', {
                to: 'hello@tryweeve.com',
                userName,
                userId,
                category,
                subject,
                timestamp: new Date().toISOString(),
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Support email API error:', error);
        return NextResponse.json(
            { error: 'Failed to send support email' },
            { status: 500 }
        );
    }
}
