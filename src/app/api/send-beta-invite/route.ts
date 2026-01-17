import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mailgun';

const generateBetaInviteEmail = (): string => {
  const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://tryweeve.com'}/weeve-logo.png`;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Weeve Beta</title>
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    * { box-sizing: border-box; }
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 20px !important; }
      .button { width: 100% !important; display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="background-color: #f4f4f4; margin: 0; padding: 40px 0; color: #333333;">
  
  <div style="display: none; max-height: 0px; overflow: hidden;">
    You're in! Your exclusive Weeve beta access is ready 🎉
  </div>

  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center">
        <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          
          <!-- Header with Gradient and Logo -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #EC1D99 0%, #B91C7A 100%); padding: 40px 0;">
              <img src="${logoUrl}" alt="Weeve" width="80" height="80" style="display: block; border-radius: 16px; background-color: white; padding: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
            </td>
          </tr>

          <!-- Content Area -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <h1 style="margin: 0 0 24px 0; color: #1a1a1a; font-size: 28px; font-weight: 700; text-align: center; letter-spacing: -0.5px;">You're In! 🎉</h1>
              
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Hi there,
              </p>
              
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                We're thrilled to invite you from our waitlist into <strong>Weeve</strong>! You're among the first to experience collaborative storytelling like never before.
              </p>
              
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Download the app for your device and let's start building together:
              </p>
              
              <!-- Download Buttons -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td align="center" style="padding: 8px 0;">
                    <a href="https://testflight.apple.com/join/ZQBgyfQn" class="button" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 50px; font-weight: 600; font-size: 15px; min-width: 220px; text-align: center;">
                       Download for iPhone
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 8px 0;">
                    <a href="https://play.google.com/store/apps/details?id=com.weeve.app.staging" class="button" style="display: inline-block; background-color: #3DDC84; color: #000000; text-decoration: none; padding: 14px 28px; border-radius: 50px; font-weight: 600; font-size: 15px; min-width: 220px; text-align: center;">
                      ▶ Download for Android
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 16px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                We're getting some serious buzz right now, so let's smash this and see what we can build together!
              </p>
              
              <!-- Important Info Section -->
              <div style="background-color: #FFF9E6; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #FFC107;">
                <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #1a1a1a;">A few things to know:</h3>
                
                <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #4a4a4a;">
                  <strong>🏆 OG Verified Badge</strong><br>
                  The first <strong>1,000 users</strong> on Weeve will automatically receive an OG verified badge on their profile. After that, verification only unlocks once you hit 10,000 followers with active engagement. You're early — this is yours to claim!
                </p>
                
                <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #4a4a4a;">
                  <strong>🧪 This is a test environment</strong><br>
                  You're entering our live test area. Updates will be pushed frequently, which means you may occasionally get logged out. If that happens, just delete the app and reinstall via TestFlight — quick and easy.
                </p>
                
                <p style="margin: 0 0 0 0; font-size: 15px; line-height: 1.6; color: #4a4a4a;">
                  <strong>💰 Monetisation</strong><br>
                  Monetisation isn't turned on yet. Our focus right now is learning, improving the product, and scaling the community properly before introducing any revenue mechanics.
                </p>
              </div>
              
              <p style="margin: 24px 0 16px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                <strong>Most importantly — we want your feedback.</strong> Tell us what works, what doesn't, what feels intuitive, and what feels confusing.
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                And above all… <strong>have fun with it</strong>. This is about creativity, collaboration, and seeing what happens when people build together.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <a href="https://www.tryweeve.com" class="button" style="display: inline-block; background-color: #EC1D99; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(236, 29, 153, 0.25);">
                      Visit Weeve
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 32px 0 0 0; font-size: 16px; line-height: 1.6; color: #4a4a4a; text-align: center;">
                Welcome to Weeve 💛
              </p>
              
              <p style="margin: 16px 0 0 0; font-size: 15px; color: #666666; text-align: center;">
                <strong>Leigh-Anne & Jamie</strong><br>
                <span style="font-size: 13px; color: #888888;">Co-founders, Weeve</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 24px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 12px; color: #999999;">
                &copy; ${new Date().getFullYear()} Weeve. All rights reserved.<br>
                <a href="https://www.tryweeve.com" style="color: #EC1D99; text-decoration: none; margin-top: 8px; display: inline-block;">www.tryweeve.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `;
};

export async function POST(request: Request) {
  try {
    const { to } = await request.json();
    
    if (!to) {
      return NextResponse.json({ success: false, error: 'Email address is required' }, { status: 400 });
    }

    const emailHtml = generateBetaInviteEmail();

    const data = await sendEmail({
      to,
      subject: "You're In! 🎉 Your Weeve Beta Access is Ready",
      text: `Hi there! We're thrilled to invite you from our waitlist into Weeve! Download for iPhone: https://testflight.apple.com/join/ZQBgyfQn - Download for Android: https://play.google.com/store/apps/details?id=com.weeve.app.staging - Welcome to Weeve! Leigh-Anne & Jamie, Co-founders`,
      html: emailHtml,
      from: 'Jamie from Weeve <jamie@tryweeve.com>',
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: any) {
    console.error('Error sending beta invite email:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET endpoint for quick testing
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const toEmail = searchParams.get('to');
    
    if (!toEmail) {
      return NextResponse.json({ success: false, error: 'Email address required. Use ?to=email@example.com' }, { status: 400 });
    }

    const emailHtml = generateBetaInviteEmail();

    const data = await sendEmail({
      to: toEmail,
      subject: "You're In! 🎉 Your Weeve Beta Access is Ready",
      text: `Hi there! We're thrilled to invite you from our waitlist into Weeve! Download for iPhone: https://testflight.apple.com/join/ZQBgyfQn - Download for Android: https://play.google.com/store/apps/details?id=com.weeve.app.staging - Welcome to Weeve! Leigh-Anne & Jamie, Co-founders`,
      html: emailHtml,
      from: 'Jamie from Weeve <jamie@tryweeve.com>',
    });

    return NextResponse.json({ success: true, data, sentTo: toEmail }, { status: 200 });
  } catch (error: any) {
    console.error('Error sending beta invite email:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
