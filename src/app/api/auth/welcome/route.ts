import { NextResponse } from 'next/server';
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

        const emailHtml = generateEmailHtml({
            title: 'Welcome to Weeve!',
            content: [
                'We are thrilled to have you join our community.',
                'Start exploring and weaving your narratives today.',
            ],
            buttonText: 'Get Started',
            buttonUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://tryweeve.com',
            previewText: 'Welcome to Weeve! We are excited to have you on board.',
        });

        await sendEmail({
            to: email,
            subject: 'Welcome to Weeve!',
            text: 'Welcome to Weeve! We are excited to have you on board.',
            html: emailHtml,
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        console.error('Welcome email error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to send welcome email' },
            { status: 500 }
        );
    }
}
