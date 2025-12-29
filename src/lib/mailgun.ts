import FormData from 'form-data';
import Mailgun from 'mailgun.js';

const mailgun = new Mailgun(FormData);

const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || '',
  url: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net',
});

interface SendEmailParams {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export const sendEmail = async ({ to, subject, text, html, from }: SendEmailParams) => {
  const domain = process.env.MAILGUN_DOMAIN;
  
  if (!domain) {
    throw new Error('MAILGUN_DOMAIN is not defined');
  }

  try {
      // Cast to any to bypass strict type check on 'template'
    const data = await mg.messages.create(domain, {
      from: from || `Weeve <postmaster@${domain}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      html,
    } as any);
    return data;
  } catch (error) {
    console.error('Error sending email with Mailgun:', error);
    throw error;
  }
};
