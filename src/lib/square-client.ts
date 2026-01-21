/**
 * Square Payments API Client
 * Handles payment creation and management via Square
 */

export interface SquarePayment {
  id: string;
  status: 'APPROVED' | 'COMPLETED' | 'CANCELED' | 'FAILED' | 'PENDING';
  source_type: string;
  amount_money: {
    amount: number; // Amount in minor units (pence/cents)
    currency: string;
  };
  total_money: {
    amount: number;
    currency: string;
  };
  created_at: string;
  updated_at: string;
  location_id: string;
  order_id?: string;
  reference_id?: string;
  note?: string;
  receipt_url?: string;
}

export interface CreatePaymentParams {
  sourceId: string; // Payment token from Web Payments SDK
  amount: number; // Amount in minor units (pence/cents)
  currency: string;
  idempotencyKey: string;
  referenceId?: string; // Our reference (user_id or story_id)
  note?: string;
  customerId?: string;
}

const SQUARE_API_BASE = {
  sandbox: 'https://connect.squareupsandbox.com/v2',
  production: 'https://connect.squareup.com/v2',
};

function getApiBase(): string {
  const env = process.env.SQUARE_ENVIRONMENT || 'sandbox';
  return SQUARE_API_BASE[env as keyof typeof SQUARE_API_BASE] || SQUARE_API_BASE.sandbox;
}

function getAccessToken(): string {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) {
    throw new Error('SQUARE_ACCESS_TOKEN environment variable is not set');
  }
  return token;
}

function getLocationId(): string {
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) {
    throw new Error('SQUARE_LOCATION_ID environment variable is not set');
  }
  return locationId;
}

/**
 * Create a payment using a payment token from the Web Payments SDK
 */
export async function createPayment(params: CreatePaymentParams): Promise<SquarePayment> {
  const apiBase = getApiBase();
  const accessToken = getAccessToken();
  const locationId = getLocationId();

  const response = await fetch(`${apiBase}/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': '2024-01-18',
    },
    body: JSON.stringify({
      source_id: params.sourceId,
      idempotency_key: params.idempotencyKey,
      amount_money: {
        amount: params.amount,
        currency: params.currency,
      },
      location_id: locationId,
      reference_id: params.referenceId,
      note: params.note,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('[Square] Payment creation failed:', response.status, errorData);
    throw new Error(`Square API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return data.payment as SquarePayment;
}

/**
 * Get an existing payment by ID
 */
export async function getPayment(paymentId: string): Promise<SquarePayment> {
  const apiBase = getApiBase();
  const accessToken = getAccessToken();

  const response = await fetch(`${apiBase}/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Square-Version': '2024-01-18',
    },
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('[Square] Get payment failed:', response.status, errorData);
    throw new Error(`Square API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return data.payment as SquarePayment;
}

/**
 * Verify webhook signature
 * Square signs webhooks using HMAC-SHA256 with the notification URL
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  notificationUrl: string
): boolean {
  const crypto = require('crypto');

  try {
    // Square webhook signature is: HMAC-SHA256(webhook_signature_key, notification_url + body)
    const signedPayload = notificationUrl + payload;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('base64');

    // Constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[Square] Signature verification error:', error);
    return false;
  }
}

/**
 * Get Square configuration for the frontend
 * Returns non-sensitive config needed by Web Payments SDK
 */
export function getSquareConfig() {
  return {
    applicationId: process.env.SQUARE_APPLICATION_ID || process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,
    locationId: process.env.SQUARE_LOCATION_ID || process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
    environment: (process.env.SQUARE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
  };
}
