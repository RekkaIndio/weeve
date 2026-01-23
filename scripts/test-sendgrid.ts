
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });

async function test() {
    console.log('Testing SendGrid...');
    // Import after loading env vars
    const { sendEmail } = await import('../src/lib/sendgrid');

    console.log('API Key present:', !!process.env.SENDGRID_API_KEY);

    try {
        const res = await sendEmail({
            to: 'jamie@tryweeve.com',
            subject: 'Test Email from Weeve Debugger',
            text: 'This is a test email to verify SendGrid configuration.',
        });
        console.log('Email sent successfully:', res);
    } catch (error) {
        console.error('Failed to send email:', error);
    }
}

test();
