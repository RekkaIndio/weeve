import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/sendgrid';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
    try {
        const { emails, communityCode, communityName, senderName } = await request.json();

        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return NextResponse.json({ error: 'No emails provided' }, { status: 400 });
        }

        if (!communityCode || !communityName) {
            return NextResponse.json({ error: 'Community info required' }, { status: 400 });
        }

        // Generate invite link
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tryweeve.com';
        const inviteLink = `${baseUrl}/signup?community=${communityCode}`;

        // Send emails
        const emailPromises = emails.map((email: string) =>
            sendEmail({
                to: email,
                subject: `You're invited to join ${communityName} on Weeve!`,
                html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h1 style="color: #EC1D99; margin-bottom: 20px;">You're Invited! 🎉</h1>
                        <p style="font-size: 16px; color: #333; line-height: 1.6;">
                            ${senderName ? `${senderName} has` : 'You have been'} invited you to join <strong>${communityName}</strong> on Weeve.
                        </p>
                        <p style="font-size: 16px; color: #333; line-height: 1.6;">
                            Weeve is a collaborative storytelling platform where communities come together to create amazing content.
                        </p>
                        <a href="${inviteLink}" style="display: inline-block; background: #EC1D99; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
                            Join ${communityName}
                        </a>
                        <p style="font-size: 14px; color: #666; margin-top: 30px;">
                            Or copy this link: <a href="${inviteLink}" style="color: #EC1D99;">${inviteLink}</a>
                        </p>
                    </div>
                `,
                text: `You're invited to join ${communityName} on Weeve! Click here to join: ${inviteLink}`,
            })
        );

        await Promise.all(emailPromises);

        return NextResponse.json({ success: true, sent: emails.length });
    } catch (error: any) {
        console.error('Failed to send invite emails:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to send invite emails' },
            { status: 500 }
        );
    }
}
