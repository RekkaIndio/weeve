import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/sendgrid';
import { createClient } from '@supabase/supabase-js';
import { generateWaitlistConfirmationEmail } from '@/lib/email-templates';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Save to database (using untyped client since waitlist table isn't in types)
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { error: dbError } = await supabase
      .from('waitlist')
      .upsert(
        { email: email.toLowerCase().trim(), name: name?.trim() || null },
        { onConflict: 'email' }
      );

    if (dbError) {
      console.error('Database error saving waitlist signup:', dbError);
    }

    // Send confirmation email to the user
    try {
      await sendEmail({
        to: email,
        subject: "You're on the Weeve waitlist! 🎉",
        text: `Thanks for joining the Weeve waitlist${name ? `, ${name}` : ''}! We'll notify you as soon as we launch.`,
        html: generateWaitlistConfirmationEmail(name?.trim()),
      });
    } catch (emailError: any) {
      console.error('Failed to send user confirmation email:', emailError?.message || emailError);
    }

    // Send notification email to admin
    try {
      const nameText = name ? ` (${name})` : '';
      await sendEmail({
        to: 'jamie@tryweeve.com',
        subject: 'New Waitlist Signup',
        text: `New user joined the waitlist: ${email}${nameText}`,
        html: `<p>New user joined the waitlist: <strong>${email}</strong>${name ? ` - ${name}` : ''}</p>`,
      });
    } catch (emailError: any) {
      console.error('Failed to send admin notification email:', emailError?.message || emailError);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Waitlist error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: 'Failed to join waitlist' },
      { status: 500 }
    );
  }
}

