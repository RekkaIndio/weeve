import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mailgun';
import { generateEmailHtml } from '@/lib/email-templates';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const toEmail = searchParams.get('to') || 'jamie@tryweeve.com';

    const emailHtml = generateEmailHtml({
      title: 'This is a test email',
      content: [
        'This email uses the new beautiful Weeve design template.',
        'It supports multiple paragraphs of content.',
        'We hope you like the new look!',
      ],
      buttonText: 'Verify Account',
      buttonUrl: 'https://tryweeve.com/verify-test',
      previewText: 'Testing the new Weeve email design template',
    });

    const data = await sendEmail({
      to: toEmail,
      subject: 'Test Email from Weeve (New Design)',
      text: 'This is a test email to verify Mailgun integration with the new design.',
      html: emailHtml,
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
