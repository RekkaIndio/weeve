
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    console.log('Testing Mailgun...');
    // Import after loading env vars
    const { sendEmail } = await import('../src/lib/mailgun');

    console.log('API Key present:', !!process.env.MAILGUN_API_KEY);
    console.log('Domain:', process.env.MAILGUN_DOMAIN);

    try {
        const res = await sendEmail({
            to: 'test@example.com',
            subject: 'Test Email from Weeve Debugger',
            text: 'This is a test email to verify Mailgun configuration.',
        });
        console.log('Email sent successfully:', res);
    } catch (error) {
        console.error('Failed to send email:', error);
    }
}

test();
