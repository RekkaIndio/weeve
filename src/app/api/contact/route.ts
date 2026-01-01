import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mailgun';
import { generateEmailHtml } from '@/lib/email-templates';

export async function POST(request: Request) {
    try {
        const { name, email, subject, message } = await request.json();

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return NextResponse.json(
                { success: false, error: 'All fields are required' },
                { status: 400 }
            );
        }

        // Map subject codes to readable names
        const subjectLabels: Record<string, string> = {
            general: 'General Inquiry',
            feedback: 'Feedback & Suggestions',
            partnership: 'Partnership Opportunities',
            press: 'Press & Media',
            other: 'Other',
        };

        const subjectLabel = subjectLabels[subject] || subject;

        // Send email to Jamie
        console.log('[Contact Form] Sending admin notification to jamie@tryweeve.com...');
        const adminEmailResult = await sendEmail({
            to: 'jamie@tryweeve.com',
            subject: `[Contact Form] ${subjectLabel} from ${name}`,
            text: `New contact form submission:\n\nFrom: ${name} (${email})\nSubject: ${subjectLabel}\n\nMessage:\n${message}`,
            html: generateEmailHtml({
                title: `New Contact Form Submission`,
                previewText: `${subjectLabel} from ${name}`,
                content: [
                    `<strong>From:</strong> ${name} (<a href="mailto:${email}">${email}</a>)`,
                    `<strong>Subject:</strong> ${subjectLabel}`,
                    `<strong>Message:</strong>`,
                    message.replace(/\n/g, '<br>'),
                ],
                buttonText: `Reply to ${name}`,
                buttonUrl: `mailto:${email}?subject=Re: ${encodeURIComponent(subjectLabel)}`,
            }),
        });
        console.log('[Contact Form] Admin email sent successfully:', adminEmailResult);

        // Send confirmation email to the user
        try {
            await sendEmail({
                to: email,
                subject: 'Thanks for contacting Weeve!',
                text: `Hi ${name},\n\nThanks for reaching out! We've received your message and will get back to you within 24-48 hours.\n\nBest,\nThe Weeve Team`,
                html: generateEmailHtml({
                    title: 'Message Received!',
                    previewText: 'Thanks for contacting Weeve',
                    content: [
                        `Hi ${name}!`,
                        `Thanks for reaching out to us. We've received your message about "${subjectLabel}" and will get back to you within 24-48 hours.`,
                        `In the meantime, feel free to check out our <a href="https://tryweeve.com/help" style="color: #EC1D99;">Help Center</a> for quick answers to common questions.`,
                    ],
                }),
            });
        } catch (confirmError: any) {
            console.error('Failed to send confirmation email:', confirmError?.message || confirmError);
            // Don't fail the whole request if confirmation email fails
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        console.error('Contact form error:', error?.message || error);
        return NextResponse.json(
            { success: false, error: 'Failed to send message' },
            { status: 500 }
        );
    }
}
