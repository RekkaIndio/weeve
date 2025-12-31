import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/mailgun';
import { generateEmailHtml } from '@/lib/email-templates';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { success: false, error: 'Email is required' },
                { status: 400 }
            );
        }

        // Generate password reset link using Supabase Admin SDK
        // This generates a link that the user visits to reset their password
        // We'll direct them to our /reset-password page which handles the token hash
        
        // Ensure we use the www subdomain for production to avoid SSL/deep link issues
        let appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.tryweeve.com';
        if (appUrl === 'https://tryweeve.com') {
            appUrl = 'https://www.tryweeve.com';
        }

        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: {
                redirectTo: `${appUrl}/reset-password`,
            },
        });

        if (error) {
            // Check for rate limit or other errors we want to hide/expose
            console.error('Supabase generateLink error:', error);
             // If user not found, Supabase might return error. We generally want to hide this.
             // But for now let's just log it.
        }

        // If data.properties.action_link is present, send it
        // Note: For 'recovery', the link contains a token hash
        if (data && data.properties && data.properties.action_link) {
             const link = data.properties.action_link;

            // Send email with Mailgun
            const emailHtml = generateEmailHtml({
                title: 'Reset your Password',
                content: [
                    'You requested a password reset for your Weeve account.',
                    'Click the button below to reset your password:',
                    'If you didn\'t request this, you can safely ignore this email.',
                    'This link will expire in 24 hours.',
                ],
                buttonText: 'Reset Password',
                buttonUrl: link,
                previewText: 'Reset your Weeve account password',
            });

            // Send email with Mailgun
            await sendEmail({
                to: email,
                subject: 'Reset your Weeve password',
                text: `Click the following link to reset your password: ${link}`,
                html: emailHtml,
            });
        } 
        
        // Always return success to prevent user enumeration
        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error: any) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process request' },
            { status: 500 }
        );
    }
}
