/**
 * PayPal REST API Client
 * Handles payment creation and management via PayPal
 */

export interface PayPalOrder {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  intent: 'CAPTURE' | 'AUTHORIZE';
  purchase_units: {
    reference_id?: string;
    amount: {
      currency_code: string;
      value: string;
    };
    description?: string;
  }[];
  create_time: string;
  update_time?: string;
  links: {
    href: string;
    rel: string;
    method: string;
  }[];
}

export interface PayPalCapture {
  id: string;
  status: 'COMPLETED' | 'DECLINED' | 'PARTIALLY_REFUNDED' | 'PENDING' | 'REFUNDED' | 'FAILED';
  purchase_units: {
    reference_id?: string;
    payments: {
      captures: {
        id: string;
        status: string;
        amount: {
          currency_code: string;
          value: string;
        };
        final_capture: boolean;
        create_time: string;
      }[];
    };
  }[];
}

const PAYPAL_API_BASE = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  production: 'https://api-m.paypal.com',
};

function getApiBase(): string {
  const env = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
  return PAYPAL_API_BASE[env as keyof typeof PAYPAL_API_BASE] || PAYPAL_API_BASE.sandbox;
}

function getClientId(): string {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId) {
    throw new Error('PAYPAL_CLIENT_ID environment variable is not set');
  }
  return clientId;
}

function getClientSecret(): string {
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!secret) {
    throw new Error('PAYPAL_CLIENT_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Get PayPal OAuth access token
 */
async function getAccessToken(): Promise<string> {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const apiBase = getApiBase();

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('[PayPal] Failed to get access token:', response.status, errorData);
    throw new Error(`PayPal authentication failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

export interface CreateOrderParams {
  amount: number; // Amount in minor units (pence/cents)
  currency: string;
  referenceId?: string;
  description?: string;
}

/**
 * Create a PayPal order
 */
export async function createOrder(params: CreateOrderParams): Promise<PayPalOrder> {
  const apiBase = getApiBase();
  const accessToken = await getAccessToken();

  // Convert from minor units (pence) to major units (pounds) with 2 decimal places
  const amountValue = (params.amount / 100).toFixed(2);

  const response = await fetch(`${apiBase}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `order_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: params.referenceId,
          description: params.description,
          amount: {
            currency_code: params.currency,
            value: amountValue,
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: 'UNRESTRICTED',
            shipping_preference: 'NO_SHIPPING',
            brand_name: 'Weeve',
            locale: 'en-GB',
            landing_page: 'BILLING',
            user_action: 'CONTINUE',
            return_url: `${process.env.NEXT_PUBLIC_WEB_APP_URL || 'http://localhost:3000'}/wallet?payment=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_WEB_APP_URL || 'http://localhost:3000'}/wallet?payment=cancelled`,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('[PayPal] Order creation failed details:', {
      status: response.status,
      statusText: response.statusText,
      error: errorData
    });
    throw new Error(`PayPal API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return data as PayPalOrder;
}

/**
 * Capture a PayPal order (finalize payment)
 */
export async function captureOrder(orderId: string): Promise<PayPalCapture> {
  const apiBase = getApiBase();
  const accessToken = await getAccessToken();

  const response = await fetch(`${apiBase}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('[PayPal] Order capture failed:', response.status, errorData);
    throw new Error(`PayPal API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return data as PayPalCapture;
}

/**
 * Get order details
 */
export async function getOrder(orderId: string): Promise<PayPalOrder> {
  const apiBase = getApiBase();
  const accessToken = await getAccessToken();

  const response = await fetch(`${apiBase}/v2/checkout/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('[PayPal] Get order failed:', response.status, errorData);
    throw new Error(`PayPal API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return data as PayPalOrder;
}

/**
 * Verify webhook signature
 * PayPal uses a more complex verification process
 */
export async function verifyWebhookSignature(
  webhookId: string,
  headers: {
    transmissionId: string;
    transmissionTime: string;
    certUrl: string;
    authAlgo: string;
    transmissionSig: string;
  },
  webhookEvent: unknown
): Promise<boolean> {
  const apiBase = getApiBase();
  const accessToken = await getAccessToken();

  try {
    const response = await fetch(`${apiBase}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: headers.authAlgo,
        cert_url: headers.certUrl,
        transmission_id: headers.transmissionId,
        transmission_sig: headers.transmissionSig,
        transmission_time: headers.transmissionTime,
        webhook_id: webhookId,
        webhook_event: webhookEvent,
      }),
    });

    if (!response.ok) {
      console.error('[PayPal] Webhook verification request failed:', response.status);
      return false;
    }

    const data = await response.json();
    return data.verification_status === 'SUCCESS';
  } catch (error) {
    console.error('[PayPal] Webhook signature verification error:', error);
    return false;
  }
}

/**
 * Get PayPal configuration for the frontend
 */
export function getPayPalConfig() {
  return {
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID,
    environment: (process.env.PAYPAL_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
    currency: 'GBP',
  };
}
