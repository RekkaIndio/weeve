import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mailgun';

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const nameText = name ? ` (${name})` : '';
    
    await sendEmail({
      to: 'jamie@tryweeve.com',
      subject: 'New Waitlist Signup',
      text: `New user joined the waitlist: ${email}${nameText}`,
      html: `<p>New user joined the waitlist: <strong>${email}</strong>${name ? ` - ${name}` : ''}</p>`,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Waitlist error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to join waitlist' },
      { status: 500 }
    );
  }
}
