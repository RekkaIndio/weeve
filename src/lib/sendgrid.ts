import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

interface SendEmailParams {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export const sendEmail = async ({ to, subject, text, html, from }: SendEmailParams) => {
  const defaultFrom = from || 'Weeve <postmaster@tryweeve.com>';

  try {
    const msg = {
      to: Array.isArray(to) ? to : [to],
      from: defaultFrom,
      subject,
      text: text || '',
      html: html || '',
    };

    const response = await sgMail.send(msg);
    return response;
  } catch (error) {
    console.error('Error sending email with SendGrid:', error);
    throw error;
  }
};
