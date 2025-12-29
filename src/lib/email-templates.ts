
interface EmailTemplateParams {
  title: string;
  content: string[];
  buttonText?: string;
  buttonUrl?: string;
  previewText?: string;
}

export const generateEmailHtml = ({
  title,
  content,
  buttonText,
  buttonUrl,
  previewText,
}: EmailTemplateParams): string => {
  const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://tryweeve.com'}/weeve-logo.png`;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    /* Reset styles */
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    * { box-sizing: border-box; }
    
    /* Responsive tweaks */
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 20px !important; }
      .button { width: 100% !important; display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="background-color: #f4f4f4; margin: 0; padding: 40px 0; color: #333333;">
  
  <div style="display: none; max-height: 0px; overflow: hidden;">
    ${previewText || content[0] || 'Updates from Weeve'}
  </div>

  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center">
        <!-- Main Container -->
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
              <h1 style="margin: 0 0 24px 0; color: #1a1a1a; font-size: 28px; font-weight: 700; text-align: center; letter-spacing: -0.5px;">${title}</h1>
              
              ${content
                .map(
                  (paragraph) =>
                    `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">${paragraph}</p>`
                )
                .join('')}
              
              ${
                buttonText && buttonUrl
                  ? `
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 32px; margin-bottom: 32px;">
                  <tr>
                    <td align="center">
                      <a href="${buttonUrl}" class="button" style="display: inline-block; background-color: #EC1D99; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(236, 29, 153, 0.25); transition: opacity 0.2s ease;">
                        ${buttonText}
                      </a>
                    </td>
                  </tr>
                </table>
                `
                  : ''
              }
              
              <p style="margin: 32px 0 0 0; font-size: 14px; color: #888888; text-align: center;">
                Best regards,<br>The Weeve Team
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 24px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 12px; color: #999999;">
                &copy; ${new Date().getFullYear()} Weeve. All rights reserved.<br>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://tryweeve.com'}" style="color: #EC1D99; text-decoration: none; margin-top: 8px; display: inline-block;">Visit our website</a>
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
