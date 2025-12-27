// Supabase Edge Function to send push notifications via FCM V1
//
// Requires:
// - FIREBASE_SERVICE_ACCOUNT in secrets (JSON string)

import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { JWT } from 'npm:google-auth-library@9.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  data?: Record<string, any>
}

async function getAccessToken(serviceAccount: any) {
  const client = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  })
  const res = await client.authorize()
  return res.access_token
}

async function sendFCMV1(accessToken: string, projectId: string, token: string, notification: Notification) {
  const message = {
    message: {
      token: token,
      notification: {
        title: notification.title,
        body: notification.message,
      },
      data: notification.data || {},
    },
  }

  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })

  return await response.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { record } = await req.json() as { record: Notification }
    
    if (!record) {
         return new Response(
            JSON.stringify({ error: 'No record provided' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // 1. Get user's push token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('user_id', record.user_id)
      .single()

    if (profileError || !profile?.push_token) {
      console.log(`[Push] No token found for user ${record.user_id}`)
      return new Response(
        JSON.stringify({ success: false, message: 'No token found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Get Service Account & Access Token
    const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!serviceAccountStr) {
        console.error('[Push] FIREBASE_SERVICE_ACCOUNT not set')
        return new Response(
            JSON.stringify({ success: false, error: 'Configuration error: Missing service account' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    const serviceAccount = JSON.parse(serviceAccountStr)
    const accessToken = await getAccessToken(serviceAccount)
    
    if (!accessToken) {
        throw new Error('Failed to generate access token')
    }

    // 3. Send Notification
    const result = await sendFCMV1(accessToken, serviceAccount.project_id, profile.push_token, record)
    console.log('[Push] FCM V1 Result:', result)

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Push] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
