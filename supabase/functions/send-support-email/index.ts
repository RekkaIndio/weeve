// Supabase Edge Function to process support email queue
// Deploy this to Supabase Edge Functions
// 
// To deploy:
// 1. Install Supabase CLI: https://supabase.com/docs/guides/cli
// 2. supabase functions deploy send-support-email
//
// Set up secrets:
// supabase secrets set RESEND_API_KEY=your_resend_api_key

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  try {
    // Create Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Get pending emails from queue
    const { data: emails, error: fetchError } = await supabase
      .from('support_email_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', 3) // Max 3 retries
      .order('created_at', { ascending: true })
      .limit(10) // Process 10 at a time

    if (fetchError) throw fetchError

    const results = []

    for (const email of emails || []) {
      try {
        // Send email via Resend
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Weeve Support <support@tryweeve.com>',
            to: [email.to_email],
            subject: `[${email.category.toUpperCase()}] ${email.subject}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #EC1D99 0%, #9333EA 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">New Support Request</h1>
                </div>
                
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                  <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="color: #EC1D99; margin-top: 0; font-size: 18px;">Request Details</h2>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>From:</strong></td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${email.user_name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>User ID:</strong></td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><code>${email.user_id}</code></td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Category:</strong></td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                          <span style="background: #EC1D99; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase; font-weight: bold;">
                            ${email.category}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Subject:</strong></td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${email.subject}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <div style="background: white; padding: 20px; border-radius: 8px;">
                    <h3 style="color: #333; margin-top: 0; font-size: 16px;">Description</h3>
                    <p style="white-space: pre-wrap; color: #555;">${email.description}</p>
                  </div>
                  
                  <div style="margin-top: 20px; padding: 15px; background: #f0f0f0; border-radius: 8px; text-align: center;">
                    <p style="margin: 0; color: #666; font-size: 12px;">
                      This message was sent from the Weeve app support system.<br>
                      Timestamp: ${new Date(email.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `,
          }),
        })

        if (!response.ok) {
          throw new Error(`Resend API error: ${response.statusText}`)
        }

        // Mark as sent
        await supabase
          .from('support_email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', email.id)

        results.push({ id: email.id, status: 'sent' })
      } catch (emailError) {
        console.error(`Failed to send email ${email.id}:`, emailError)

        // Mark as failed and increment retry count
        await supabase
          .from('support_email_queue')
          .update({
            status: email.retry_count >= 2 ? 'failed' : 'pending',
            retry_count: email.retry_count + 1,
            error_message: emailError.message,
          })
          .eq('id', email.id)

        results.push({ id: email.id, status: 'failed', error: emailError.message })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 500 
      }
    )
  }
})
